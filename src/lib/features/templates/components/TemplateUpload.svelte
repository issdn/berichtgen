<script lang="ts">
	import type { TimeSpreadResult } from '$wizard/types';

	import { page } from '$app/state';
	import { AsyncResource } from '$core/async.svelte';
	import Dropzone from '$core/components/Dropzone.svelte';
	import { extractFilesSimple } from '$core/scan/file_scan';
	import {
		TEMPLATE_MAX_BYTES,
		TEMPLATE_MAX_COUNT_PER_USER
	} from '$lib/constants';
	import { BerichtgenError, ECommonServerError } from '$lib/errors';
	import { getTemplates } from '$templates/api/templates.remote';
	import { FileTypes } from '$wizard/enums';
	import { ETemplateError } from '$wizard/errors';
	import { renderDocxBlob } from '$wizard/write/write_docx';
	import * as Sentry from '@sentry/sveltekit';
	import { onDestroy } from 'svelte';
	import { toast } from 'svelte-sonner';

	import { templatesMutationContext } from '../contexts';
	import TemplateDocxPreviewDialog from './TemplateDocxPreviewDialog.svelte';

	const mutation = templatesMutationContext.get();

	const {
		query
	}: {
		query: ReturnType<typeof getTemplates>;
	} = $props();

	/** Minimal sample data used to render uploaded templates before submitting them. */
	const TEMPLATE_PREVIEW_ENTRIES: TimeSpreadResult = [
		{
			ausbildungsjahr: 2025,
			datum: '2025-01-06',
			endDatum: '2025-01-12',
			ort: 'BETRIEB',
			stunden: 40,
			text: 'Beispiel: Tätigkeiten dokumentiert und Arbeitsablauf reflektiert.'
		}
	];

	let pendingPreparedFile = $state<null | {
		bytes: Uint8Array<ArrayBuffer>;
		file: File;
		isDuplicate: boolean;
		previewUrl: string;
	}>(null);

	let previewOpen = $state(false);

	const preparePreview = new AsyncResource(
		async (file: File) => {
			const bytes: Uint8Array<ArrayBuffer> = new Uint8Array(
				await file.arrayBuffer()
			);
			const previewBlob = await renderDocxBlob({
				entries: Promise.resolve(TEMPLATE_PREVIEW_ENTRIES),
				template: bytes,
				userMetadata: page.data.userMetadata
			});

			const isDuplicate = query.current?.templates
				.filter((t) => t.is_mine)
				.some((t) => t.storage_path.endsWith(`/${file.name}`));

			return {
				bytes,
				file,
				isDuplicate: Boolean(isDuplicate),
				previewUrl: URL.createObjectURL(previewBlob)
			};
		},
		{
			onError: (error) => {
				toast.error(error.message, {
					description: error.cause,
					closeButton: true,
					duration: Infinity
				});
			}
		}
	);

	const uploadMutation = new AsyncResource(
		async (params: { file: File; isPublic: boolean }) => {
			mutation?.start();
			try {
				await uploadTemplateFile({
					file: params.file,
					isPublic: params.isPublic
				});
				await query.refresh();
				return true;
			} finally {
				mutation?.end();
			}
		},
		{
			onError: (error) => {
				toast.error(error.message, {
					description: error.cause
				});
			},
			onSuccess: () => {
				toast.success('Datei erfolgreich hochgeladen.');
			}
		}
	);

	const isPending = $derived(preparePreview.loading || uploadMutation.loading);

	function clearPendingPreview() {
		if (pendingPreparedFile?.previewUrl) {
			URL.revokeObjectURL(pendingPreparedFile.previewUrl);
		}
		pendingPreparedFile = null;
	}

	onDestroy(() => {
		clearPendingPreview();
	});

	$effect(() => {
		if (!previewOpen && pendingPreparedFile !== null) {
			clearPendingPreview();
		}
	});

	async function handleFiles(input: DataTransferItemList | FileList) {
		const files = extractFilesSimple(input);
		const firstFile = files[0];
		if (!firstFile) return;

		if (firstFile.type !== FileTypes.DOCX) {
			toast.error('Nur .docx Dateien sind erlaubt.');
			return;
		}

		if (firstFile.size > TEMPLATE_MAX_BYTES) {
			toast.error('Die Datei darf maximal 5MB groß sein.');
			return;
		}

		const ownTemplates =
			query.current?.templates
				.filter((template) => template.is_mine)
				.slice(0, TEMPLATE_MAX_COUNT_PER_USER) ?? [];
		const isDuplicateOwnTemplate = ownTemplates.some((template) =>
			template.storage_path.endsWith(`/${firstFile.name}`)
		);
		if (
			!isDuplicateOwnTemplate &&
			ownTemplates.length >= TEMPLATE_MAX_COUNT_PER_USER
		) {
			toast.error('Du kannst maximal 3 Vorlagen hochladen.');
			return;
		}

		const prepared = await preparePreview.execute(firstFile);
		if (!prepared) return;

		clearPendingPreview();
		pendingPreparedFile = prepared;
		previewOpen = true;
	}

	async function submitUpload({
		isPublic
	}: {
		isPublic: boolean;
	}): Promise<boolean> {
		if (!pendingPreparedFile) return false;

		const uploaded = await uploadMutation.execute({
			file: pendingPreparedFile.file,
			isPublic
		});

		if (!uploaded) return false;
		clearPendingPreview();
		return true;
	}

	function getTemplateBucketName({ isPublic }: { isPublic: boolean }) {
		return isPublic ? 'templates' : 'private-templates';
	}

	async function uploadTemplateFile({
		file,
		isPublic
	}: {
		file: File;
		isPublic: boolean;
	}) {
		const userId = page.data.user?.id;
		if (!userId) {
			throw new BerichtgenError(ECommonServerError.UNAUTHORIZED);
		}

		const storagePath = `${userId}/${file.name}`;
		const targetBucketName = getTemplateBucketName({ isPublic });
		const existingTemplate = query.current?.templates.find(
			(template) => template.is_mine && template.storage_path === storagePath
		);
		const previousBucketName = existingTemplate
			? getTemplateBucketName({ isPublic: existingTemplate.is_public })
			: null;

		const uploadResult = await page.data.supabase.storage
			.from(targetBucketName)
			.upload(storagePath, file, {
				contentType: file.type,
				upsert: true
			});

		if (uploadResult.error) {
			throw new BerichtgenError({
				...ETemplateError.TEMPLATE_UPLOAD_FAILED,
				cause: uploadResult.error.message
			});
		}

		if (
			previousBucketName !== null &&
			previousBucketName !== targetBucketName
		) {
			const removeResult = await page.data.supabase.storage
				.from(previousBucketName)
				.remove([storagePath]);

			if (removeResult.error) {
				Sentry.captureException(
					new BerichtgenError({
						...ETemplateError.TEMPLATE_OLD_BUCKET_CLEANUP_FAILED,
						cause: removeResult.error.message
					})
				);
			}
		}
	}
</script>

<Dropzone disabled={isPending} {handleFiles} class="min-h-48" />

{#if pendingPreparedFile}
	<TemplateDocxPreviewDialog
		bind:open={previewOpen}
		title="Vorlage vor dem Upload prüfen"
		description={pendingPreparedFile.isDuplicate
			? `Die Vorlage "${pendingPreparedFile.file.name}" existiert bereits und wird beim Upload überschrieben.`
			: 'Prüfe die gerenderte Beispielausgabe und bestätige danach den Upload.'}
		fileUrl={pendingPreparedFile.previewUrl}
		confirmLabel={pendingPreparedFile.isDuplicate
			? 'Privat ersetzen'
			: 'Privat hochladen'}
		confirmDisabled={isPending}
		onConfirm={() => submitUpload({ isPublic: false })}
		secondaryConfirmLabel={pendingPreparedFile.isDuplicate
			? 'Öffentlich ersetzen'
			: 'Öffentlich hochladen'}
		onSecondaryConfirm={() => submitUpload({ isPublic: true })}
	/>
{/if}

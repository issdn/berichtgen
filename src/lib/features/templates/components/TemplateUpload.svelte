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
	import {
		getTemplates,
		uploadTemplate
	} from '$templates/api/templates.remote';
	import Checkbox from '$ui/checkbox/checkbox.svelte';
	import { Label } from '$ui/label';
	import { FileTypes } from '$wizard/enums';
	import { renderDocxBlob } from '$wizard/write/write_docx';
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
	let isPublic = $state(false);

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
		async (params: {
			data: Uint8Array<ArrayBuffer>;
			isPublic: boolean;
			name: string;
			type: string;
		}) => {
			mutation?.start();
			try {
				await uploadTemplate(params).updates(query);
				return true;
			} finally {
				mutation?.end();
			}
		},
		{
			onError: (error) => {
				toast.error('Fehler beim Hochladen der Datei.', {
					description: error.cause ?? error.message
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
			toast.error('Du kannst maximal 3 Templates hochladen.');
			return;
		}

		const prepared = await preparePreview.execute(firstFile);
		if (!prepared) return;

		clearPendingPreview();
		pendingPreparedFile = prepared;
		previewOpen = true;
	}

	async function submitUpload(): Promise<boolean> {
		if (!pendingPreparedFile) return false;

		const uploaded = await uploadMutation.execute({
			data: pendingPreparedFile.bytes,
			isPublic,
			name: pendingPreparedFile.file.name,
			type: pendingPreparedFile.file.type
		});

		if (!uploaded) return false;
		clearPendingPreview();
		return true;
	}
</script>

<div class="flex h-full w-full flex-col gap-y-2">
	<div class="flex items-center gap-x-2">
		<Checkbox id="template-public" bind:checked={isPublic} />
		<Label for="template-public" class="text-sm">
			Template für andere Nutzer öffentlich machen
		</Label>
	</div>
	<Dropzone disabled={isPending} {handleFiles} class="min-h-48" />
</div>

{#if pendingPreparedFile}
	<TemplateDocxPreviewDialog
		bind:open={previewOpen}
		title="Template vor dem Upload prüfen"
		description={pendingPreparedFile.isDuplicate
			? `Das Template "${pendingPreparedFile.file.name}" existiert bereits und wird beim Upload überschrieben.`
			: 'Prüfe die gerenderte Beispielausgabe und bestätige danach den Upload.'}
		fileUrl={pendingPreparedFile.previewUrl}
		confirmLabel={pendingPreparedFile.isDuplicate ? 'Ersetzen' : 'Hochladen'}
		confirmDisabled={isPending}
		onConfirm={submitUpload}
	/>
{/if}

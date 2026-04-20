<script lang="ts">
	import { onDestroy } from 'svelte';
	import Dropzone from '$board/components/Dropzone.svelte';
	import { extractFilesSimple } from '$core/scan/file_scan';
	import { AsyncResource } from '$core/async.svelte';
	import { page } from '$app/state';
	import {
		getTemplates,
		uploadTemplate
	} from '$templates/api/templates.remote';
	import { FileTypes } from '$wizard/enums';
	import type { ResultEntry } from '$wizard/types';
	import { renderDocxBlob } from '$wizard/write/write_docx';
	import { toast } from 'svelte-sonner';
	import { getTemplatesMutationContext } from '../contexts';
	import TemplateDocxPreviewDialog from './TemplateDocxPreviewDialog.svelte';

	const mutation = getTemplatesMutationContext();

	const {
		query
	}: {
		query: ReturnType<typeof getTemplates>;
	} = $props();

	/** Minimal sample data used to render uploaded templates before submitting them. */
	const TEMPLATE_PREVIEW_ENTRIES: ResultEntry[] = [
		{
			text: 'Beispiel: Tätigkeiten dokumentiert und Arbeitsablauf reflektiert.',
			datum: '2025-01-06',
			endDatum: '2025-01-12',
			ort: 'BETRIEB',
			stunden: 40,
			ausbildungsjahr: 2
		}
	];

	let pendingFile = $state<File | null>(null);
	let pendingFileBytes = $state<Uint8Array<ArrayBuffer> | null>(null);
	let pendingPreviewUrl = $state<string | null>(null);
	let pendingReplace = $state(false);
	let previewOpen = $state(false);

	const preparePreview = new AsyncResource(
		async (file: File) => {
			const bytes: Uint8Array<ArrayBuffer> = new Uint8Array(
				await file.arrayBuffer()
			);
			const previewBlob = await renderDocxBlob({
				template: bytes,
				entries: Promise.resolve(TEMPLATE_PREVIEW_ENTRIES),
				userMetadata: page.data.userMetadata
			});

			const isDuplicate = query.current?.templates
				.filter((t) => t.is_mine)
				.some((t) => t.storage_path.endsWith(`/${file.name}`));

			return {
				file,
				bytes,
				previewUrl: URL.createObjectURL(previewBlob),
				isDuplicate: Boolean(isDuplicate)
			};
		},
		{
			onError: (error) => {
				toast.error('Vorschau konnte nicht erstellt werden.', {
					description: error.message
				});
			}
		}
	);

	const uploadMutation = new AsyncResource(
		async (params: {
			name: string;
			type: string;
			data: Uint8Array<ArrayBuffer>;
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
			onSuccess: () => {
				toast.success('Datei erfolgreich hochgeladen.');
			},
			onError: (error) => {
				toast.error('Fehler beim Hochladen der Datei.', {
					description: error.cause ?? error.message
				});
			}
		}
	);

	const isPending = $derived(preparePreview.loading || uploadMutation.loading);

	function clearPendingPreview() {
		if (pendingPreviewUrl) {
			URL.revokeObjectURL(pendingPreviewUrl);
		}
		pendingFile = null;
		pendingFileBytes = null;
		pendingPreviewUrl = null;
		pendingReplace = false;
	}

	onDestroy(() => {
		clearPendingPreview();
	});

	$effect(() => {
		if (!previewOpen && pendingFile !== null) {
			clearPendingPreview();
		}
	});

	async function handleFiles(input: FileList | DataTransferItemList) {
		const files = extractFilesSimple(input);
		const firstFile = files[0];
		if (!firstFile) return;

		if (firstFile.type !== FileTypes.DOCX) {
			toast.error('Nur .docx Dateien sind erlaubt.');
			return;
		}

		if (firstFile.size > 10 * 1024 * 1024) {
			toast.error('Die Datei darf maximal 10MB groß sein.');
			return;
		}

		const prepared = await preparePreview.execute(firstFile);
		if (!prepared) return;

		clearPendingPreview();
		pendingFile = prepared.file;
		pendingFileBytes = prepared.bytes;
		pendingPreviewUrl = prepared.previewUrl;
		pendingReplace = prepared.isDuplicate;
		previewOpen = true;
	}

	async function submitUpload(): Promise<boolean> {
		if (!pendingFile || !pendingFileBytes) return false;

		const uploaded = await uploadMutation.execute({
			name: pendingFile.name,
			type: pendingFile.type,
			data: pendingFileBytes
		});

		if (!uploaded) return false;
		clearPendingPreview();
		return true;
	}
</script>

<div class="h-full w-full">
	<Dropzone disabled={isPending} {handleFiles} />
</div>

{#if pendingPreviewUrl}
	<TemplateDocxPreviewDialog
		bind:open={previewOpen}
		title="Template vor dem Upload prüfen"
		description={pendingReplace
			? `„${pendingFile?.name}" existiert bereits und wird beim Upload überschrieben.`
			: 'Prüfe die gerenderte Beispielausgabe und bestätige danach den Upload.'}
		fileUrl={pendingPreviewUrl}
		confirmLabel={pendingReplace ? 'Ersetzen' : 'Hochladen'}
		confirmDisabled={isPending}
		onConfirm={submitUpload}
	/>
{/if}

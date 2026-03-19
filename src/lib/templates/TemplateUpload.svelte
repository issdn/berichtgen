<script lang="ts">
	import Dropzone from '$src/lib/components/Dropzone.svelte';
	import { FileTypes } from '$src/lib/enums';
	import { extractFilesSimple } from '$src/lib/parse/file_scan';
	import { toast } from 'svelte-sonner';
	import { uploadTemplate, getTemplates } from './templates.remote';
	import { toErrorBody } from '../errors';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';

	const {
		query
	}: {
		query: ReturnType<typeof getTemplates>;
	} = $props();

	let isPending = $state(false);
	let pendingFile = $state<File | null>(null);
	let confirmOpen = $state(false);

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

		const isDuplicate = query.current?.templates
			.filter((t) => t.is_mine)
			.some((t) => t.storage_path.endsWith(`/${firstFile.name}`));

		if (isDuplicate) {
			pendingFile = firstFile;
			confirmOpen = true;
			return;
		}

		await doUpload(firstFile);
	}

	async function doUpload(file: File) {
		isPending = true;
		try {
			const data = new Uint8Array(await file.arrayBuffer());
			await uploadTemplate({
				name: file.name,
				type: file.type,
				data
			}).updates(query);
			toast.success('Datei erfolgreich hochgeladen.');
		} catch (e) {
			toast.error('Fehler beim Hochladen der Datei.', {
				description: toErrorBody(e).cause
			});
		} finally {
			isPending = false;
			pendingFile = null;
		}
	}
</script>

<div class="h-full w-full">
	<Dropzone disabled={isPending} {handleFiles} />
</div>

<AlertDialog.Root bind:open={confirmOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Template ersetzen?</AlertDialog.Title>
			<AlertDialog.Description>
				„{pendingFile?.name}" existiert bereits und wird unwiderruflich überschrieben.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={() => (pendingFile = null)}>Abbrechen</AlertDialog.Cancel>
			<AlertDialog.Action onclick={() => doUpload(pendingFile!)}>Ersetzen</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

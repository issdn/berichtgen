<script lang="ts">
	import Dropzone from '$src/lib/components/Dropzone.svelte';
	import { FileTypes } from '$src/lib/enums';
	import { extractFilesSimple } from '$src/lib/parse/file_scan';
	import { toast } from 'svelte-sonner';
	import { uploadTemplate, getTemplates } from './templates.remote';
	import { toErrorBody } from '../errors';

	const {
		query
	}: {
		query: ReturnType<typeof getTemplates>;
	} = $props();

	let isPending = $state(false);

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

		isPending = true;
		try {
			const data = new Uint8Array(await firstFile.arrayBuffer());
			await uploadTemplate({
				name: firstFile.name,
				type: firstFile.type,
				data
			}).updates(query);
			toast.success('Datei erfolgreich hochgeladen.');
		} catch (e) {
			toast.error('Fehler beim Hochladen der Datei.', {
				description: toErrorBody(e).cause
			});
		} finally {
			isPending = false;
		}
	}
</script>

<div class="h-full w-full">
	<Dropzone disabled={isPending} {handleFiles} />
</div>

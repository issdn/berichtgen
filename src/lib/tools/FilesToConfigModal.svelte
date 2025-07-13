<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import Dropzone from '$src/lib/components/Dropzone.svelte';
	import { buttonVariants } from '$src/lib/components/ui/button';
	import Button from '$src/lib/components/ui/button/button.svelte';
	import { ScanReturnType } from '$src/lib/enums';
	import { get2DimensionalDirectories } from '$src/lib/parse/file_scan';
	import { Download, FileType } from '@lucide/svelte';
	import JSZip from 'jszip';

	let resultFiles = $state<Map<string, string> | null>(null);

	async function handleFiles(items: DataTransferItemList) {
		const directories = (await get2DimensionalDirectories(
			items,
			ScanReturnType.DATA_TRANSFER_ITEM
		)) as FileSystemFileEntry[][];

		const texts = new Map<string, string>();
		for (const file of directories.flat()) {
			const parent = await new Promise<FileSystemEntry>(file.getParent);
			texts.set(
				parent.name,
				(texts.get(parent.name) || '') + `SCHULE,"${file.name}",YYYY-MM-DD;YYYY-MM-DD;40\n`
			);
		}
		resultFiles = texts;
	}
</script>

<Dialog.Root>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}
		><FileType />Config Erstellen</Dialog.Trigger
	>
	<Dialog.Content class="min-h-72">
		<Dialog.Header>
			<Dialog.Title>Config-Template generieren</Dialog.Title>
		</Dialog.Header>
		<div class="pt-8 pb-4">
			<Dropzone {handleFiles} />
		</div>
		<Button
			disabled={!resultFiles}
			onclick={async () => {
				if (!resultFiles) return;
				let blob: Blob;
				if (resultFiles!.size === 1) {
					blob = new Blob([...resultFiles!.values()], { type: 'text/plain' });
				} else {
					resultFiles.forEach((value, key) => zip.file(`berichtgen(${key}).txt`, value));
					var zip = new JSZip();
					blob = await zip.generateAsync({ type: 'blob' });
				}
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				if (resultFiles!.size === 1) {
					a.download = 'berichtgen.txt';
				} else {
					a.download = 'berichtgen.zip';
				}
				a.click();
				URL.revokeObjectURL(url);
			}}
		>
			<Download />Herunterladen
		</Button>
	</Dialog.Content>
</Dialog.Root>

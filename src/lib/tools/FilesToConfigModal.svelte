<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import Dropzone from '$src/lib/components/Dropzone.svelte';
	import { buttonVariants } from '$src/lib/components/ui/button';
	import Button from '$src/lib/components/ui/button/button.svelte';
	import { getArrayDepth } from '$src/lib/utils/math';
	import { Download, FileType } from '@lucide/svelte';
	import JSZip from 'jszip';

	let resultFiles = $state<string[] | null>(null);

	async function scanFiles(item: FileSystemEntry, items: FileSystemFileEntry[] = []) {
		if (item.isDirectory) {
			const directoryReader = (item as FileSystemDirectoryEntry).createReader();
			const allEntries: FileSystemFileEntry[] = [];
			let entriesResult: FileSystemFileEntry[] = [];

			do {
				const readEntriesPromise = new Promise<FileSystemFileEntry[]>((resolve, reject) => {
					directoryReader.readEntries(async (entries) => {
						resolve((await Promise.all(entries.map((entry) => scanFiles(entry, items)))).flat());
					}, reject);
				});
				entriesResult = await readEntriesPromise;
				if (entriesResult.length > 0) {
					allEntries.push(entriesResult as unknown as FileSystemFileEntry);
				}
			} while (entriesResult.length > 0);

			return allEntries;
		} else if (item.isFile) {
			return [...items, item] as FileSystemFileEntry[];
		}
		return items;
	}

	async function handleFiles(files: DataTransferItemList) {
		const twoDimDirs = await Promise.all(
			[...files].map((file) => {
				const entry = file.webkitGetAsEntry();
				return scanFiles(entry!);
			})
		);
		const depth = getArrayDepth(twoDimDirs);
		const directories = twoDimDirs.flat(depth) as FileSystemFileEntry[];

		const texts = new Map<string, string>();
		for (const file of directories) {
			const parent = await new Promise<FileSystemEntry>(file.getParent);
			texts.set(
				parent.name,
				(texts.get(parent.name) || '') + `SCHULE,"${file.name}",YYYY-MM-DD;YYYY-MM-DD;40\n`
			);
		}
		resultFiles = [...texts.values()].map((text) => text.trimEnd());
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
				if (resultFiles?.length === 1) {
					blob = new Blob([resultFiles[0]], { type: 'text/plain' });
				} else {
					resultFiles.forEach((text, i) => zip.file(`berichtgen(${i}).txt`, text));
					var zip = new JSZip();
					blob = await zip.generateAsync({ type: 'blob' });
				}
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				if (resultFiles?.length === 1) {
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

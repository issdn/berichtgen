<script lang="ts">
	import { ScanReturnValue } from '$core/types';

	import {
		get2DimensionalDirectories,
		getFileListWithPreserverFolderStructure
	} from '$core/scan/file_scan';
	import { buttonVariants } from '$ui/button';
	import { Download, FileType } from '@lucide/svelte';
	import JSZip from 'jszip';
	import * as Dialog from '$ui/dialog';
	import { Button } from '$ui/button';
	import { SvelteMap } from 'svelte/reactivity';
	import Dropzone from '../../components/Dropzone.svelte';
	import { buildConfigMap } from '$core/config/services/config_generator';

	let resultFiles = $state<SvelteMap<string, string> | null>(null);

	let filesNumber = $state(0);

	async function handleFiles(items: DataTransferItemList | FileList) {
		const directories =
			items instanceof FileList
				? getFileListWithPreserverFolderStructure(items)
				: ((await get2DimensionalDirectories(
						items,
						ScanReturnValue.DATA_TRANSFER_ITEM
					)) as FileSystemFileEntry[][]);
		const allFiles = directories.flat();
		filesNumber = allFiles.length;
		resultFiles = new SvelteMap(buildConfigMap(allFiles));
	}

	function getFilenameLeading(key: string) {
		return key.length === 0 ? '' : `(${key})`;
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
			<Dropzone {handleFiles} {filesNumber} />
		</div>
		<Button
			disabled={!resultFiles}
			onclick={async () => {
				if (!resultFiles) return;
				let blob: Blob;
				if (resultFiles!.size === 1) {
					blob = new Blob([...resultFiles!.values()], { type: 'text/plain' });
				} else {
					const zip = new JSZip();
					resultFiles.forEach((value, key) =>
						zip.file(`berichtgen${getFilenameLeading(key)}.txt`, value)
					);
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

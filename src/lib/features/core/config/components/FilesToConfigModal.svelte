<script lang="ts">
	import { ScanReturnValue } from '$core/types';

	import {
		scanDroppedInput
	} from '$core/scan/file_scan';
	import { buttonVariants } from '$ui/button';
	import { Download, FileType } from '@lucide/svelte';
	import JSZip from 'jszip';
	import * as Dialog from '$ui/dialog';
	import { Button } from '$ui/button';
	import { SvelteMap } from 'svelte/reactivity';
	import Dropzone from '../../components/Dropzone.svelte';
	import { buildConfigMap } from '$core/config/services/config_generator';
	import { downloadBlob } from '$lib/utils';

	let resultFiles = $state<SvelteMap<string, string> | null>(null);

	let filesNumber = $state(0);

	async function handleFiles(items: DataTransferItemList | FileList) {
		const directories = await scanDroppedInput(
			items,
			ScanReturnValue.DATA_TRANSFER_ITEM
		);
		const allFiles = directories.flat();
		filesNumber = allFiles.length;
		resultFiles = new SvelteMap(buildConfigMap(allFiles));
	}

	function getFilenameLeading(key: string) {
		return key.length === 0 ? '' : `(${key})`;
	}

	async function downloadResult() {
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

		downloadBlob(
			blob,
			resultFiles!.size === 1 ? 'berichtgen.txt' : 'berichtgen.zip'
		);
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
		<Button disabled={!resultFiles} onclick={downloadResult}>
			<Download />Herunterladen
		</Button>
	</Dialog.Content>
</Dialog.Root>

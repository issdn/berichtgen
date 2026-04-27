<script lang="ts">
	import GlobalPasteHandler from '$lib/components/GlobalPasteHandler.svelte';
	import * as Kbd from '$ui/kbd';
	import { FileTypes } from '$wizard/enums';
	import { Clock, FileCheck, FileUp, FileX } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let {
		handleFiles,
		filesNumber = $bindable(null),
		disabled = false,
		accept = Object.values(FileTypes).join(',')
	}: {
		handleFiles: (files: DataTransferItemList | FileList) => Promise<void>;
		filesNumber?: number | null;
		disabled?: boolean;
		accept?: string;
	} = $props();

	let input = $state<HTMLInputElement>();
	let isDraggingIn = $state(false);
	let isDraggedInputValid = $state(true);

	async function extractAndHandleFiles(
		dataTransfer: DataTransfer | FileList | null
	) {
		if (dataTransfer instanceof DataTransfer) {
			if (!dataTransfer) {
				toast.error('Browser API Fehler. Versuche mit einem anderen Browser.');
				return;
			}
			const maybeItems = dataTransfer.items;
			if (maybeItems == null) {
				toast.error('Keine gültigen Dateien gefunden.');
				return;
			}
			await handleFiles(maybeItems);
		} else if (dataTransfer instanceof FileList) {
			await handleFiles(dataTransfer);
		}
	}

	function preventDefaults(e: Event) {
		e.preventDefault();
		e.stopPropagation();
	}

	function handleDragEnter(e: DragEvent) {
		preventDefaults(e);
		isDraggingIn = true;
		const items = [...(e.dataTransfer?.items ?? [])];

		const allValid = items.every((item) => accept.includes(item.type));
		isDraggedInputValid = allValid ? true : false;
	}

	function handleDragLeave(e: DragEvent) {
		preventDefaults(e);
		isDraggingIn = false;
		isDraggedInputValid = true;
	}

	function handleDragOver(e: DragEvent) {
		preventDefaults(e);
		isDraggingIn = true;
	}

	async function handleDrop(e: DragEvent) {
		preventDefaults(e);
		isDraggingIn = false;
		isDraggedInputValid = true;
		await extractAndHandleFiles(e.dataTransfer);
	}

	async function handleChange(e: Event) {
		const target = e.target as HTMLInputElement;
		await extractAndHandleFiles(target.files);
		// Reset value so selecting the same file again triggers the change event.
		target.value = '';
	}

	async function handlePaste(e: ClipboardEvent) {
		// URL paste: wrap as a text/uri-list File so the wizard treats it like a URL entry.
		// Pass dt.files (FileList) rather than dt so getFileListWithPreserverFolderStructure
		// is used — webkitGetAsEntry() returns null for programmatically-added files.
		const text = e.clipboardData?.getData('text/plain')?.trim();
		if (text && URL.canParse(text)) {
			const dt = new DataTransfer();
			dt.items.add(new File([text], text, { type: 'text/uri-list' }));
			await extractAndHandleFiles(dt.files);
			return;
		}
		if (!e.clipboardData?.files.length) return;
		await extractAndHandleFiles(e.clipboardData);
	}

</script>

<GlobalPasteHandler {handlePaste}>
	<label
		id="dropzone"
		data-testid="dropzone"
		data-dragging={isDraggingIn}
		data-valid={isDraggedInputValid}
		class="text-border hover:border-primary hover:text-primary data-[dragging=true]:border-primary data-[dragging=true]:text-primary data-[valid=false]:border-destructive data-[valid=false]:text-destructive relative flex h-full min-h-64 w-full flex-col items-center justify-center gap-y-2 border-4 border-dashed
	         text-sm font-medium transition-colors duration-300"
		ondragenter={handleDragEnter}
		ondragleave={handleDragLeave}
		ondragover={handleDragOver}
		ondrop={handleDrop}
		onchange={handleChange}
	>
	<Kbd.Group class="absolute bottom-2 left-2">
		<Kbd.Root>Strg</Kbd.Root>
		<span>+</span>
		<Kbd.Root>V</Kbd.Root>
	</Kbd.Group>
	<input
		data-testid="dropzone-input"
		{accept}
		bind:this={input}
		type="file"
		multiple
		style="display:none"
		{disabled}
	/>
	{#if filesNumber && filesNumber > 0}
		<FileCheck size={48} />
		{filesNumber ? filesNumber : ''} Dateien ausgewählt
	{:else if disabled}
		<Clock size={48} />
	{:else if isDraggedInputValid === false}
		<FileX size={48} />Ungültige Datei(en) erkannt
	{:else}
		<FileUp size={48} />Dateien hier droppen
	{/if}
	</label>
</GlobalPasteHandler>

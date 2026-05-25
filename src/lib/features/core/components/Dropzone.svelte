<script lang="ts">
	import GlobalPasteHandler from '$lib/components/GlobalPasteHandler.svelte';
	import { cn } from '$lib/utils';
	import * as Kbd from '$ui/kbd';
	import { FileTypes } from '$wizard/enums';
	import { Clock, FileCheck, FileUp, FileX } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let {
		accept,
		class: className,
		disabled = false,
		filesNumber = $bindable(null),
		handleFiles,
		isValidFile
	}: {
		accept?: string;
		class?: string;
		disabled?: boolean;
		filesNumber?: null | number;
		handleFiles: (files: DataTransferItemList | FileList) => Promise<void>;
		isValidFile?: (file: File) => boolean;
	} = $props();

	let isDraggingIn = $state(false);
	let isDraggedInputValid = $state(true);

	const matchesAccept = (type: string) =>
		type === FileTypes.URI_LIST ||
		(type.length > 0 && (accept ? accept.includes(type) : false));

	function isFileValid(file: File): boolean {
		return matchesAccept(file.type) && (isValidFile ? isValidFile(file) : true);
	}

	function areFilesValid(files: FileList): boolean {
		return [...files].every(isFileValid);
	}

	async function extractAndHandleFiles(
		dataTransfer: DataTransfer | FileList | null
	) {
		if (dataTransfer instanceof DataTransfer) {
			const maybeItems = dataTransfer.items;
			if (maybeItems == null) {
				toast.error('Keine gueltigen Dateien gefunden.');
				return;
			}
			await handleFiles(maybeItems);
		} else if (dataTransfer instanceof FileList) {
			if (!areFilesValid(dataTransfer)) {
				toast.error('Ungueltige Datei(en) erkannt');
				return;
			}
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

		const allValid = items.every((item) => {
			const file = item.getAsFile();
			if (!file) {
				// Folder-like drag entries usually have no MIME type.
				// If a MIME type exists, still validate it (e.g. video/mp4).
				return item.type ? matchesAccept(item.type) : true;
			}

			return isFileValid(file);
		});

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
		// URL paste: wrap as FileTypes.URI_LIST so the wizard treats it like a URL entry.
		// Pass dt.files (FileList) rather than dt so getFileListWithPreserverFolderStructure
		// is used - webkitGetAsEntry() returns null for programmatically-added files.
		const text = e.clipboardData?.getData('text/plain')?.trim();
		if (text && URL.canParse(text)) {
			const dt = new DataTransfer();
			dt.items.add(new File([text], text, { type: FileTypes.URI_LIST }));
			await extractAndHandleFiles(dt.files);
			return;
		}
		if (text) {
			const dt = new DataTransfer();
			dt.items.add(new File([text], 'clipboard.txt', { type: FileTypes.TXT }));
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
		class={cn(
			'text-border hover:border-primary hover:text-primary',
			'data-[dragging=true]:border-primary data-[dragging=true]:text-primary',
			'data-[valid=false]:border-destructive data-[valid=false]:text-destructive data-[valid=false]:[&_kbd]:text-destructive',
			'relative flex min-h-64 w-full flex-col items-center justify-center gap-y-2 border-4 border-dashed',
			'text-sm font-medium transition-colors duration-300',
			className
		)}
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

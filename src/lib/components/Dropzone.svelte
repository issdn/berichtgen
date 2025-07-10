<script lang="ts">
	import { FileCheck, FileUp } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { pasteStack } from '$src/lib/stores/paste_stack.svelte';

	let {
		handleFiles,
		files = $bindable()
	}: { handleFiles: (files: File[]) => void; files?: File[] | null } = $props();

	let input = $state<HTMLInputElement>();
	let isDraggingIn = $state(false);

	async function scanFiles(item: FileSystemEntry, items: File[] = []) {
		if (item.isDirectory) {
			const directoryReader = (item as FileSystemDirectoryEntry).createReader();

			const allEntries: File[] = [];
			let entriesResult: File[] = [];
			do {
				const readEntriesPromise = new Promise<File[]>((resolve, reject) => {
					directoryReader.readEntries(async (entries) => {
						if (entries.length === 0) {
							resolve([]);
						} else {
							resolve((await Promise.all(entries.map((entry) => scanFiles(entry, items)))).flat());
						}
					}, reject);
				});
				entriesResult = await readEntriesPromise;
				allEntries.push(...entriesResult);
			} while (entriesResult.length > 0);

			return allEntries;
		} else if (item.isFile) {
			const readFilePromise = new Promise<File>((resolve, reject) => {
				(item as FileSystemFileEntry).file(resolve, reject);
			});
			return [...items, await readFilePromise];
		}
		return items;
	}

	async function extractAndHandleFiles(dataTransfer: DataTransfer | null) {
		if (!dataTransfer) {
			toast.error('Browser API Fehler. Versuche mit einem anderen Browser.');
			return;
		}
		const maybeItems = dataTransfer.items;
		if (maybeItems == null) {
			toast.error('Keine Dateien gefunden.');
			return;
		}
		const entry = maybeItems[0].webkitGetAsEntry();
		if (!entry) {
			toast.error('Keine gültigen Dateien gefunden.');
			return;
		}
		try {
			const files = await scanFiles(entry);
			handleFiles(files);
		} catch (error) {
			toast.error('Fehler beim Scannen der Dateien: ' + error);
		}
	}

	function preventDefaults(e: Event) {
		e.preventDefault();
		e.stopPropagation();
	}

	function handleDragEnter(e: DragEvent) {
		preventDefaults(e);
		isDraggingIn = true;
	}

	function handleDragLeave(e: DragEvent) {
		preventDefaults(e);
		isDraggingIn = false;
	}

	function handleDragOver(e: DragEvent) {
		preventDefaults(e);
		isDraggingIn = true;
	}

	async function handleDrop(e: DragEvent) {
		preventDefaults(e);
		isDraggingIn = false;
		await extractAndHandleFiles(e.dataTransfer);
	}

	async function handleChange(e: Event) {
		await extractAndHandleFiles((e as InputEvent).dataTransfer);
	}

	async function handlePaste(e: ClipboardEvent) {
		await extractAndHandleFiles(e.clipboardData);
	}

	onMount(() => {
		pasteStack.push(handlePaste);

		return () => {
			pasteStack.pop();
		};
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<button
	id="dropzone"
	class={`text-border hover:border-primary hover:text-primary flex h-full min-h-64 w-full flex-col items-center justify-center gap-y-2 border-4 border-dashed text-sm transition-colors duration-300 ${isDraggingIn ? 'border-primary text-primary' : 'text-border hover:border-primary hover:text-primary'}`}
	onclick={input?.click}
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
	onchange={handleChange}
>
	<input
		accept=".docx,.pdf,.json,.txt,.csv,.png,.jpg,.jpeg"
		bind:this={input}
		type="file"
		multiple
		style="display:none"
		webkitdirectory
	/>
	{#if files != null && files.length > 0}
		<FileCheck size={48} />
		<label for="dropzone" class="pointer-events-none w-full px-8">
			<ol>
				{#each files as file}
					<li class="truncate overflow-hidden">{file.name}</li>
				{/each}
			</ol>
		</label>
	{:else}
		<FileUp size={48} />
		<label for="dropzone" class="pointer-events-none font-medium"> Dateien hier droppen </label>
	{/if}
</button>

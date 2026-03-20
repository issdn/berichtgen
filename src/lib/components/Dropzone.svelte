<script lang="ts">
	import { Clock, FileCheck, FileUp } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { pasteStack } from '$src/lib/stores/paste_stack.svelte';
	import * as Kbd from '$lib/components/ui/kbd/index.js';

	let {
		handleFiles,
		filesNumber = $bindable(null),
		disabled = false
	}: {
		handleFiles: (files: DataTransferItemList | FileList) => Promise<void>;
		filesNumber?: number | null;
		disabled?: boolean;
	} = $props();

	let input = $state<HTMLInputElement>();
	let isDraggingIn = $state(false);

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
		await extractAndHandleFiles((e.target as HTMLInputElement).files);
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

<button
	id="dropzone"
	data-testid="dropzone"
	class={`text-border hover:border-primary hover:text-primary relative flex h-full min-h-64 w-full flex-col items-center justify-center gap-y-2 border-4 border-dashed text-sm transition-colors duration-300 ${isDraggingIn ? 'border-primary text-primary' : 'text-border hover:border-primary hover:text-primary'}`}
	onclick={() => input?.click()}
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
	onchange={handleChange}
	{disabled}
>
	<Kbd.Group class="absolute bottom-2 left-2">
		<Kbd.Root>Strg</Kbd.Root>
		<span>+</span>
		<Kbd.Root>V</Kbd.Root>
	</Kbd.Group>
	<input
		data-testid="dropzone-input"
		accept=".docx,.pdf,.json,.txt,.csv,.png,.jpg,.jpeg"
		bind:this={input}
		type="file"
		multiple
		style="display:none"
		{disabled}
	/>
	{#if filesNumber && filesNumber > 0}
		<FileCheck size={48} />
		<label for="dropzone" class="pointer-events-none font-medium">
			{filesNumber ? filesNumber : ''} Dateien ausgewählt
		</label>
	{:else if disabled}
		<Clock size={48} />
	{:else}
		<FileUp size={48} />
		<label for="dropzone" class="pointer-events-none font-medium">
			Dateien hier droppen
		</label>
	{/if}
</button>

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

	function handleDrop(e: DragEvent) {
		preventDefaults(e);
		isDraggingIn = false;
		const maybeFiles = e.dataTransfer?.files ?? null;
		if (maybeFiles != null) {
			files = Array.from(maybeFiles);
			handleFiles(files);
		}
	}

	function handleChange(e: Event) {
		const maybeFiles = (e.target as HTMLInputElement | undefined)?.files ?? null;
		if (maybeFiles != null) {
			files = Array.from(maybeFiles);
			handleFiles(files);
		}
	}

	function handlePaste(e: ClipboardEvent) {
		const maybeFiles = e.clipboardData?.files;
		if (!maybeFiles) {
			toast.error('Keine Dateien in der Zwischenablage gefunden.');
			return;
		}
		if (maybeFiles.length > 0) {
			const isFirefox =
				navigator.userAgent.toLowerCase().includes('firefox') && maybeFiles.length > 1;
			if (isFirefox) {
				toast.error(
					'Firefox unterstützt das Einfügen von mehr als einer Datei aus der Zwischenablage nicht.'
				);
				return;
			}
			files = Array.from(maybeFiles);
			handleFiles(files);
		}
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
	onclick={() => input?.click()}
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

<script lang="ts">
	import { FileCheck, FileUp } from '@lucide/svelte';
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';
	import { toast } from 'svelte-sonner';

	let { handleFiles }: { handleFiles: (files: File[]) => void } = $props();

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
		const files = e.dataTransfer?.files ?? null;
		if (files != null) {
			handleFiles(Array.from(files));
		}
	}

	function handleChange(e: Event) {
		const files = (e.target as HTMLInputElement | undefined)?.files ?? null;
		if (files != null) {
			handleFiles(Array.from(files));
		}
	}

	function handlePaste(e: ClipboardEvent) {
		const files = e.clipboardData?.files;
		if (!files) {
			toast.error('Keine Dateien in der Zwischenablage gefunden.');
			return;
		}
		if (files.length > 0) {
			const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
			if (isFirefox) {
				toast.error('Firefox unterstützt das Einfügen von Dateien aus der Zwischenablage nicht.');
				return;
			}
			handleFiles(Array.from(files));
		}
	}
</script>

<svelte:window onpaste={handlePaste} />

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
	{#if wizardScheduler.files != null && wizardScheduler.files.length > 0}
		<FileCheck size={48} />
		<label for="dropzone" class="pointer-events-none w-full px-8">
			<ol>
				{#each wizardScheduler.files as file}
					<li class="truncate overflow-hidden">{file.name}</li>
				{/each}
			</ol>
		</label>
	{:else}
		<FileUp size={48} />
		<label for="dropzone" class="pointer-events-none font-medium"> Dateien hier droppen </label>
	{/if}
</button>

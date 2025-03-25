<script lang="ts">
	import { File } from 'lucide-svelte';

	let { files = $bindable<FileList | null>() } = $props();

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
		files = e.dataTransfer?.files;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<button
	id="dropzone"
	class={`flex h-full w-full flex-col items-center justify-center gap-y-2 border-2 border-dashed text-sm text-border transition-colors duration-300 hover:border-primary hover:text-primary ${isDraggingIn ? 'border-primary text-primary' : 'text-border hover:border-primary hover:text-primary'}`}
	onclick={() => input?.click()}
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
>
	<input
		bind:files
		accept=".odt,.docx,.pdf"
		bind:this={input}
		type="file"
		multiple
		style="display:none"
	/>
	<File size={48} />
	<label for="dropzone" class="pointer-events-none"> Dateien hier droppen </label>
</button>

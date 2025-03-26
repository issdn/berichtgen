<script lang="ts">
	import { File, FileCheck } from 'lucide-svelte';
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';

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
	}

	function handleChange(e: Event) {
		wizardScheduler.files = (e.target as HTMLInputElement | undefined)?.files ?? null;
		wizardScheduler.processInit = wizardScheduler.init();
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
	onchange={handleChange}
>
	<input accept=".odt,.docx,.pdf" bind:this={input} type="file" multiple style="display:none" />
	{#if wizardScheduler.files != null && wizardScheduler.files.length > 0}
		<FileCheck size={48} />
		<label for="dropzone" class="pointer-events-none w-full px-8">
			<ol>
				{#each wizardScheduler.files as file}
					<li class="overflow-hidden truncate">{file.name}</li>
				{/each}
			</ol>
		</label>
	{:else}
		<File size={48} />
		<label for="dropzone" class="pointer-events-none"> Dateien hier droppen </label>
	{/if}
</button>

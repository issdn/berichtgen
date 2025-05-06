<script lang="ts">
	import { FileCheck, FileUp } from 'lucide-svelte';
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';
	import { countUserTokens } from '$src/lib/utils/token_counter';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import Button from '$src/lib/components/ui/button/button.svelte';
	import { goto } from '$app/navigation';

	let { userTokens }: { userTokens: number } = $props();

	let input = $state<HTMLInputElement>();
	let isDraggingIn = $state(false);

	let error: string | null = $state(null);
	let dialogOpen = $derived(error !== null);

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
			handleFiles(files);
		}
	}

	function handleChange(e: Event) {
		const files = (e.target as HTMLInputElement | undefined)?.files ?? null;
		if (files != null) {
			handleFiles(files);
		}
	}

	function handleFiles(files: FileList) {
		const filesArray = Array.from(files);
		const { totalTokens } = countUserTokens(userTokens, filesArray);
		const tokensAsWords = userTokens / 4;
		const tokensAsParagraphs = userTokens / 100;
		if (totalTokens > userTokens) {
			error = `Du hast ${userTokens} Tokens. Das sind ${tokensAsWords} Wörter oder ${tokensAsParagraphs} Absätze. Die Dateien, die du hochgeladen hast, benötigen ${totalTokens} Tokens.`;
			wizardScheduler.files = null;
		} else {
			error = null;
			wizardScheduler.files = files;
			wizardScheduler.processInit = wizardScheduler.init();
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<button
	id="dropzone"
	class={`flex h-full min-h-64 w-full flex-col items-center justify-center gap-y-2 border-4 border-dashed text-sm text-border transition-colors duration-300 hover:border-primary hover:text-primary ${isDraggingIn ? 'border-primary text-primary' : 'text-border hover:border-primary hover:text-primary'}`}
	onclick={() => input?.click()}
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
	onchange={handleChange}
>
	<input
		accept=".docx,.pdf,.json,.txt,.csv"
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
					<li class="overflow-hidden truncate">{file.name}</li>
				{/each}
			</ol>
		</label>
	{:else}
		<FileUp size={48} />
		<label for="dropzone" class="pointer-events-none font-medium"> Dateien hier droppen </label>
	{/if}
</button>

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Nicht genüg Tokens 🥲</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-y-2 pt-4">
			<p>{error}</p>
			<div class="flex w-full flex-row justify-end">
				<Button onclick={() => goto('/board/kauf')}>Tokens kaufen</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

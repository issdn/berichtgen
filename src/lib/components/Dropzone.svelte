<script lang="ts">
	import { FileCheck, FileUp } from '@lucide/svelte';
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';
	import { countUserTokens } from '$src/lib/utils/token_counter';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import Button from '$src/lib/components/ui/button/button.svelte';
	import { goto } from '$app/navigation';
	import { FileTypes, type UserContext } from '$src/lib/types';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import { toast } from 'svelte-sonner';
	import { getContext } from 'svelte';
	import { CONFIG_FILENAME } from '$src/lib/constants';

	let { loggedIn } = getContext<UserContext>('user')();

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
		error = null;
		const filesArray = Array.from(files);
		const anyNonJsonFiles = filesArray.find((f) => f.type !== FileTypes.JSON);
		if (loggedIn) {
			const hasDiscount = berichtgenStore.currentProvider?.token != null;
			const { totalTokens } = countUserTokens(
				hasDiscount ? berichtgenStore.userTokens! / 4 : berichtgenStore.userTokens!,
				filesArray
			);
			if (totalTokens > berichtgenStore.userTokens!) {
				if (!anyNonJsonFiles) {
					if (berichtgenStore.rewordJSON === true) {
						berichtgenStore.rewordJSON = false;
						toast.info('JSON-Dateien Umformulierung wurde automatisch deaktiviert.');
					}
					init(files);
				} else {
					error = `Du hast ${berichtgenStore.userTokens} Tokens. Die Dateien, die du hochgeladen hast, benötigen ${totalTokens} Tokens.`;
					wizardScheduler.files = null;
				}
			} else {
				init(files);
			}
		} else {
			if (anyNonJsonFiles) {
				error =
					'Du musst angemeldet sein um andere Dateien parsen und umformulieren zu können! Bitte lade nur JSON-Dateien hoch.';
				wizardScheduler.files = null;
			} else {
				if (berichtgenStore.rewordJSON === true) {
					berichtgenStore.rewordJSON = false;
					toast.info('JSON-Dateien Umformulierung wurde automatisch deaktiviert.');
				}
				init(files);
			}
		}
	}

	function init(files: FileList) {
		const { files: otherFiles, configFile } = extractConfigFile(files);
		wizardScheduler.files = otherFiles;
		wizardScheduler.configFile = configFile;
		wizardScheduler.processInit = wizardScheduler.init();
	}

	function extractConfigFile(files: FileList): { files: File[]; configFile: File | null } {
		const filesArray = Array.from(files);
		const configFile = filesArray.find((file) => file.name === CONFIG_FILENAME) || null;
		const otherFiles = filesArray.filter((file) => file.name !== CONFIG_FILENAME);
		return { files: otherFiles, configFile };
	}
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

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Nicht genüg Tokens 🥲</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-y-2 pt-4">
			<p>{error}</p>
			<div class="flex w-full flex-row justify-end">
				<Button onclick={() => goto('/board/user/kauf')}>Tokens kaufen</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

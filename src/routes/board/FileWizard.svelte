<script lang="ts">
	import { fly } from 'svelte/transition';
	import { parseDOCX, parseDOCXData } from '$lib/parse/docx_parser';
	import { onMount, type Snippet } from 'svelte';
	import type { Scheduler } from 'tesseract.js';
	import { IncuriaError, IncuriaErrorType, WizardStep } from '$lib/types';

	const {
		file,
		onResult,
		errorSnippet,
		loadingSnippet,
		loadedSnippet,
		scheduler
	}: {
		file: File;
		onResult: (file: string) => void;
		errorSnippet: Snippet<[string]>;
		loadingSnippet: Snippet<[WizardStep]>;
		loadedSnippet: Snippet;
		scheduler: Scheduler;
	} = $props();

	let text = $state<string[]>([]);

	let error = $state<string | null>(null);

	let loaded = $state(false);

	async function processFiles() {
		text = [];
		try {
			const data = new Uint8Array(await file.arrayBuffer());
			if (data === null)
				throw new IncuriaError(IncuriaErrorType.INVALID_FILE, 'Unbekannter Fehler');
			else {
				const docxData = await parseDOCXData(data, scheduler);
				text = await parseDOCX(docxData, scheduler);
			}
		} catch (e) {
			if (e instanceof Error) {
				error = e.message;
			} else {
				error = 'Unbekannter Fehler';
			}
		} finally {
			onResult(text.join('\n'));
			loaded = true;
		}
	}

	onMount(() => processFiles());
</script>

<div
	transition:fly
	class="flex h-12 w-full flex-row items-center gap-x-2 rounded-sm bg-background px-4"
>
	{#if error != null}
		{@render errorSnippet(error)}
	{:else if loaded}
		{@render loadedSnippet()}
	{:else}
		{@render loadingSnippet(WizardStep.PROCESSING)}
	{/if}
</div>

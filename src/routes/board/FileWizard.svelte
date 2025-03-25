<script lang="ts">
	import { fly } from 'svelte/transition';
	import { parseDOCX, parseDOCXData } from 'llm-berichtsheft-json';
	import { onDestroy, onMount } from 'svelte';
	import { Progress } from '$lib/components/ui/progress/index.js';

	const { file, onResult }: { file: File | null; onResult: (file: string) => void } = $props();

	let shouldBreak = false;

	let text = $state<string[]>([]);

	let error = $state<string | null>(null);

	let max = $state(0);

	let curr = $state(0);

	let mounted = $state(false);

	let loaded = $state(false);

	async function processFiles() {
		const { createWorker } = await import('tesseract.js');

		text = [];
		try {
			if (file === null) throw new Error('Unbekannter Fehler');
			mounted = true;
			const data = new Uint8Array(await file.arrayBuffer());
			if (data === null) throw new Error('Unbekannter Fehler');
			else {
				const worker = await createWorker('deu');
				const docxData = await parseDOCXData(data, worker);
				max = docxData.textsOrRelIds.length;
				const stream = parseDOCX(docxData, worker);
				for await (const page of stream) {
					text = [...text, page];
					curr += 1;
					if (shouldBreak) break;
				}
				worker.terminate();
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

	onDestroy(() => (shouldBreak = false));
</script>

{#if mounted}
	<div
		transition:fly
		class="flex h-12 w-full flex-row items-center gap-x-2 rounded-sm bg-background px-4"
	>
		{#if error != null}
			<span class="overflow-hidden truncate">{error}</span>
		{:else if loaded}
			<span class="overflow-hidden truncate">{file!.name}</span>
		{:else}
			<span class="overflow-hidden truncate">{file!.name}</span>
			<Progress value={curr} {max} />
		{/if}
	</div>
{/if}

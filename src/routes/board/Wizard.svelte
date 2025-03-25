<script lang="ts">
	import FileWizard from './FileWizard.svelte';

	const { files }: { files: FileList | null } = $props();

	const batchSize = 1;

	let filesAsText = $state<string[]>([]);

	let filesReady = $state(0);

	$effect(() => {
		if (files !== null && filesReady === files.length) {
			$inspect(filesAsText);
		}
	});

	const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

	async function createWorkerPool(files: FileList) {
		const { createScheduler, createWorker } = await import('tesseract.js');
		const scheduler = createScheduler();
		for (let i = 0; i < clamp(files.length * 0.1, 1, 25); i++) {
			scheduler.addWorker(await createWorker('deu'));
		}
		return scheduler;
	}
</script>

{#snippet errorSnippet(error: string)}
	<span class="overflow-hidden truncate">{error}</span>
{/snippet}

{#snippet loadingSnippet()}
	<span class="overflow-hidden truncate">In Verarbeitung...</span>
{/snippet}

{#snippet loadedSnippet()}
	<span class="overflow-hidden truncate">Fertig</span>
{/snippet}

{#if files != null}
	<div class="relative h-full w-full rounded-lg bg-secondary p-8">
		{#await createWorkerPool(files) then scheduler}
			{#each files as file, i}
				{#if i <= filesReady + batchSize}
					<FileWizard
						{file}
						{errorSnippet}
						{loadingSnippet}
						{loadedSnippet}
						{scheduler}
						onResult={(file) => {
							filesAsText = [...filesAsText, file];
							filesReady += 1;
						}}
					/>
				{:else}
					<span class="overflow-hidden truncate">{file.name}</span>
				{/if}
			{/each}
		{/await}
	</div>
{/if}

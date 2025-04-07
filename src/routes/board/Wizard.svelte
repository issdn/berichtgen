<script lang="ts">
	import WizardFile from './WizardFile.svelte';
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Download } from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import { onMount } from 'svelte';
	import * as pdf from 'pdfjs-dist/legacy/build/pdf.mjs';
	import ProviderSelect from './ProviderSelect.svelte';

	onMount(() => {
		if (typeof window !== 'undefined' && typeof document !== 'undefined') {
			import('pdfjs-dist/build/pdf.worker.min?url').then((pdfWorkerURL) => {
				pdf.GlobalWorkerOptions.workerSrc = new URL(
					pdfWorkerURL.default,
					import.meta.url
				).toString();
			});
		}
	});
</script>

<div class="relative h-full w-full gap-y-8 rounded-lg border">
	<div
		class="flex flex-row items-center justify-between gap-x-4 bg-muted p-4 text-muted-foreground"
	>
		<ProviderSelect />
		{#if wizardScheduler.result !== null}
			{#await wizardScheduler.result then result}
				<Button href={result} download="bericht.json"><Download />Herunterladen</Button>
			{/await}
		{:else}
			<Button disabled={true}><Download />Herunterladen</Button>
		{/if}
	</div>
	<div class="flex flex-col gap-y-1 p-1">
		{#if wizardScheduler.schedule !== null && wizardScheduler.processInit !== null}
			{#await wizardScheduler.processInit then}
				{#each wizardScheduler.schedule as { context, machine }, i}
					{#if i <= wizardScheduler.filesReady + wizardScheduler.batchSize}
						<WizardFile {context} {machine} />
					{:else}
						<span class="overflow-hidden truncate">{context.file.name}</span>
					{/if}
				{/each}
			{/await}
		{/if}
	</div>
</div>

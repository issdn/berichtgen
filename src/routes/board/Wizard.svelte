<script lang="ts">
	import WizardFile from './WizardFile.svelte';
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Download } from 'lucide-svelte';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { onMount } from 'svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import * as pdf from 'pdfjs-dist/legacy/build/pdf.mjs';
	import ProviderSelect from './ProviderSelect.svelte';
	import { incuriaStore } from '$lib/stores/board.svelte';

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

<div class="relative h-full w-full gap-y-8 rounded-lg border-4">
	<div class="flex flex-row flex-wrap items-center justify-between gap-x-4 bg-muted p-4">
		<div class="flex flex-row items-center gap-x-4">
			<ProviderSelect />
			<Tooltip.Provider>
				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child(props)}
							<div class="flex items-center space-x-2">
								<Checkbox
									disabled={wizardScheduler.isRunning}
									{...props}
									id="terms"
									bind:checked={incuriaStore.processPhotos}
									aria-labelledby="terms-label"
								/>
								<Label
									id="terms-label"
									for="terms"
									class="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									Bilder verarbeiten
								</Label>
							</div>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content>
						<div class="flex flex-col gap-y-2">
							<p class="text-base">Bilder von Dateien extrahieren und lesen.</p>
							<p class="text-sm text-muted-foreground">
								*Die Verarbeitung der Bilder dauert DEUTLICH länger
							</p>
						</div>
					</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
		</div>
		{#if wizardScheduler.result !== null}
			{#await wizardScheduler.result then result}
				<Button href={result} download="bericht.json"><Download />Herunterladen</Button>
			{/await}
		{:else}
			<Button disabled={true}><Download />Herunterladen</Button>
		{/if}
	</div>
	<div class="flex min-h-64 flex-col gap-y-1 p-4">
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

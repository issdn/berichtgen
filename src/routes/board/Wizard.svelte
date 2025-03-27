<script lang="ts">
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Download } from 'lucide-svelte';
</script>

<div class="relative h-full w-full gap-y-8 rounded-lg bg-secondary p-8">
	{#if wizardScheduler.result !== null}
		{#await wizardScheduler.result then result}
			<div class="flex h-12 flex-row items-center gap-x-4 bg-background px-4">
				<Button href={result} download="bericht.json"><Download />Herunterladen</Button>
			</div>
		{/await}
	{/if}
	{#if wizardScheduler.schedule !== null && wizardScheduler.processInit !== null}
		{#await wizardScheduler.processInit}
			<p>Loading...</p>
		{:then}
			{#each wizardScheduler.schedule as { wizardFile }, i}
				{@const { file, max, step, value } = wizardFile}
				{$inspect(value, max)}
				{#if i <= wizardScheduler.filesReady + wizardScheduler.batchSize}
					<div class="flex h-14 flex-col justify-center gap-y-1 bg-background px-4">
						<div class="flex h-full w-full flex-row items-center gap-x-4">
							<span class="overflow-hidden truncate">{file.name}</span>
							<Progress {max} {value} />
						</div>
						<span class="text-sm">{step.step} {step.message}</span>
					</div>
				{:else}
					<span class="overflow-hidden truncate">{file.name}</span>
				{/if}
			{/each}
		{:catch e}
			<span>Initialisierung fehlgeschlagen</span>
		{/await}
	{/if}
</div>

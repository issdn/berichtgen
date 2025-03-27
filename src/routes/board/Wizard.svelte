<script lang="ts">
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Binary, Bug, Check, Coffee, Download, WandSparkles, Calendar } from 'lucide-svelte';
	import { WizardStep } from '$lib/types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { fly, slide } from 'svelte/transition';

	function statusFromStep(step: WizardStep) {
		switch (step) {
			case WizardStep.INITIALISING:
				return { icon: Coffee, label: 'Initialiserung...' };
			case WizardStep.PROCESSING:
				return { icon: Binary, label: 'Verarbeitung...' };
			case WizardStep.AI_COMPLETION:
				return { icon: WandSparkles, label: 'KI-Umformulierung...' };
			case WizardStep.TIME_SPREADING:
				return { icon: Calendar, label: 'Zeitliche Verteilung...' };
			case WizardStep.DONE:
				return { icon: Check, label: 'Fertig' };
			case WizardStep.ERROR:
				return { icon: Bug, label: 'Fehler' };
		}
	}
</script>

{#snippet renderFileProcess({
	value,
	max,
	name,
	step,
	message
}: {
	max: number;
	value: number;
	name: string;
	step: WizardStep;
	message?: string;
})}
	{@const { icon: Icon, label } = statusFromStep(step)}
	<div transition:slide class="flex flex-col justify-center gap-y-4 bg-muted p-4">
		<div class="flex h-full w-full flex-row items-center gap-x-4">
			<span class="basis-1/4 overflow-hidden truncate">{name}</span>
			{#if step < 3}
				<Progress class="basis-3/4" {max} {value} />
			{/if}
		</div>
		<div class="flex flex-row justify-between opacity-65">
			<div class="flex flex-row items-center gap-x-1">
				<Icon size={18} /><span class="text-sm font-medium">{label}</span>
			</div>
			<span class="text-sm font-medium">{value}/{max}</span>
		</div>
	</div>
{/snippet}

<div class="relative h-full w-full gap-y-8 rounded-lg border">
	<div
		class="flex flex-row items-center justify-between gap-x-4 bg-muted p-4 text-muted-foreground"
	>
		{#if wizardScheduler.files === null}
			<p transition:fly>Es wird auf die Dateien gewartet.</p>
		{:else if (wizardScheduler.finished?.length ?? 0) === wizardScheduler.files.length}
			<p transition:fly>Fertig!</p>
		{:else}
			<p transition:fly>
				{wizardScheduler.finished?.length ?? 0}/{wizardScheduler.files.length}
			</p>
		{/if}
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
			{#await wizardScheduler.processInit}
				<p>Loading...</p>
			{:then}
				{#each wizardScheduler.schedule as { wizardFile }, i}
					{@const { file, max, step, value } = wizardFile}
					{#if i <= wizardScheduler.filesReady + wizardScheduler.batchSize}
						{@render renderFileProcess({ value, max, ...step, name: file.name })}
					{:else}
						<span class="overflow-hidden truncate">{file.name}</span>
					{/if}
				{/each}
			{:catch e}
				<span>Initialisierung fehlgeschlagen</span>
			{/await}
		{/if}
	</div>
</div>

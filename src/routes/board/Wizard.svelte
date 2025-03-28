<script lang="ts">
	import WizardFile from './WizardFile.svelte';

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

<div class="relative h-full w-full gap-y-8 rounded-lg border">
	<div
		class="flex flex-row items-center justify-between gap-x-4 bg-muted p-4 text-muted-foreground"
	>
		<div>
			{#if wizardScheduler.files === null}
				<p transition:slide>Es wird auf die Dateien gewartet.</p>
			{:else if (wizardScheduler.finished?.length ?? 0) === wizardScheduler.files.length}
				<p transition:slide>Fertig!</p>
			{:else}
				<p transition:slide>
					{wizardScheduler.finished?.length ?? 0}/{wizardScheduler.files.length}
				</p>
			{/if}
		</div>
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
				{#each wizardScheduler.schedule as { wizardFile }, i}
					{@const { file, max, step, value } = wizardFile}
					{#if i <= wizardScheduler.filesReady + wizardScheduler.batchSize}
						<WizardFile {value} {max} {...step} name={file.name} />
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

<script lang="ts">
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import { Binary, Bug, Check, Coffee, WandSparkles, Calendar } from 'lucide-svelte';
	import { WizardStep } from '$lib/types';
	import { slide } from 'svelte/transition';
	import TimeSpreadDialog from '$lib/components/TimeSpreadDialog.svelte';
	import type { WizardFileProcess } from '$lib/wizard_scheduler.svelte';
	import { onMount } from 'svelte';

	const {
		progress
	}: {
		progress: WizardFileProcess;
	} = $props();

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
			case WizardStep.WAITING:
				return { icon: Check, label: 'Warten' };
			case WizardStep.ERROR:
				return { icon: Bug, label: 'Fehler' };
		}
	}

	let { icon: Icon, label } = $derived.by(() => statusFromStep(progress.step));
</script>

<div transition:slide class="flex flex-col justify-center gap-y-4 bg-muted p-4">
	<div class="flex h-full w-full flex-row items-center justify-between gap-x-4">
		<span class="basis-1/4 overflow-hidden truncate">{progress.file.name}</span>
		{#if progress.step === WizardStep.PROCESSING}
			<Progress class="basis-3/4" max={progress.max} value={progress.value} />
		{/if}
		<TimeSpreadDialog data={[]} />
	</div>
	<div class="flex flex-row justify-between opacity-65">
		<div class="flex flex-row items-center gap-x-1">
			<Icon size={18} /><span class="text-sm font-medium">{label}</span>
		</div>
		<span class="text-sm font-medium">{progress.value}/{progress.max}</span>
	</div>
</div>

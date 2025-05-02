<script lang="ts">
	import { Binary, XIcon, Check, Coffee, WandSparkles, Calendar, Clock, Bug } from 'lucide-svelte';
	import { WizardStep } from '$lib/types';
	import { slide } from 'svelte/transition';
	import TimeSpreadDialog from '$lib/components/TimeSpreadDialog.svelte';
	import type { WizardScheduler } from '$lib/wizard_scheduler.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';

	const { context, machine }: ReturnType<WizardScheduler['createProcessStateMachine']> = $props();

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
				return { icon: Check, label: 'Fertig 📜' };
			case WizardStep.WAITING:
				return { icon: Clock, label: 'Warten auf Eingabe' };
			case WizardStep.ERROR:
				return { icon: Bug, label: 'Fehler 😭' };
			case WizardStep.CANCELLED:
				return { icon: XIcon, label: 'Abgebrochen' };
		}
	}

	let { icon: Icon, label } = $derived.by(() => statusFromStep($machine));
</script>

<div transition:slide class="flex flex-col justify-center gap-y-4 rounded-md bg-muted p-4">
	<div class="flex h-full w-full flex-row items-center justify-between gap-x-4">
		<span class="basis-2/5 overflow-hidden truncate">{context.file.name}</span>
		{#if $machine === WizardStep.PROCESSING}
			<Progress class="basis-3/5" max={context.max} value={context.value} />
		{:else if $machine === WizardStep.ERROR}
			<p class="text-sm text-muted-foreground">{context.error!.message}</p>
		{/if}
		{#if $machine !== WizardStep.DONE && $machine !== WizardStep.ERROR && $machine !== WizardStep.CANCELLED}
			<div class="flex flex-row gap-x-2">
				<Tooltip.Provider>
					<Tooltip.Root open={$machine === WizardStep.WAITING}>
						<Tooltip.Trigger>
							<TimeSpreadDialog
								id={context.file.name}
								onClose={() => {
									if (context.dateRanges.length > 0) {
										machine.run();
									}
								}}
								onValidChange={(data) => (context.dateRanges = data)}
							/>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>Bitte datiere die Datei.</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
				<Button
					variant="default"
					onclick={() => {
						context.cancelled = true;
						machine.run();
					}}><XIcon /></Button
				>
			</div>
		{/if}
	</div>
	<div class="flex flex-row justify-between opacity-65">
		<div class="flex flex-row items-center gap-x-1">
			<Icon size={18} /><span class="text-sm font-medium">{label}</span>
		</div>
		<span class="text-sm font-medium">{context.value}/{context.max}</span>
	</div>
</div>

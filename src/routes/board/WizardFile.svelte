<script lang="ts">
	import { Binary, XIcon, Check, Coffee, WandSparkles, Calendar, Clock, Bug } from '@lucide/svelte';
	import { WizardStep } from '$lib/enums';
	import { slide } from 'svelte/transition';
	import TimeSpreadDialog from '$lib/components/TimeSpreadDialog.svelte';
	import type { WizardScheduler } from '$lib/wizard_scheduler.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import Spinner from '$src/lib/components/ui/Spinner.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';

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
				return { icon: Check, label: 'Fertig' };
			case WizardStep.WAITING:
				return { icon: Clock, label: 'Warten auf Eingabe' };
			case WizardStep.ERROR:
				return { icon: Bug, label: 'Fehler' };
			case WizardStep.CANCELLED:
				return { icon: XIcon, label: 'Abgebrochen' };
		}
	}

	let { icon: Icon, label } = $derived.by(() => statusFromStep($machine));
</script>

<div transition:slide class="bg-muted flex flex-col justify-center gap-y-4 rounded-md p-4">
	<div class="flex h-full w-full flex-row items-center justify-between gap-x-4">
		<span class="truncate overflow-hidden">{context.file.name}</span>
		{#if $machine === WizardStep.WAITING}
			<div class="flex flex-row gap-x-2">
				<Tooltip.Provider>
					<Tooltip.Root open={$machine === WizardStep.WAITING}>
						<Tooltip.Trigger>
							<TimeSpreadDialog
								id={context.file.name}
								onClose={() => {
									if ((context.dateRanges?.ranges?.length ?? 0) > 0) {
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
	<div class="flex flex-row justify-between">
		<div class="flex flex-row items-center gap-x-1">
			{#if $machine === WizardStep.ERROR}
				<Tooltip.Provider delayDuration={100}>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Badge variant="default" class="gap-x-2">
								<Icon size={18} /><span class="text-sm font-medium">{label}</span>
							</Badge>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p class="bg-background max-w-96">{context.error!.message}</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			{:else}
				<Badge variant="default" class="gap-x-2">
					<Icon size={18} /><span class="text-sm font-medium">{label}</span>
				</Badge>
			{/if}
		</div>
		{#if $machine === WizardStep.PROCESSING || $machine === WizardStep.AI_COMPLETION || $machine === WizardStep.TIME_SPREADING}
			<div class="flex flex-row items-center gap-x-2">
				{#if context.max !== 0}
					<span class="text-sm font-medium">Elemente: {context.value}/{context.max}</span>
				{/if}
				<Spinner size="sm" />
			</div>
		{/if}
	</div>
</div>

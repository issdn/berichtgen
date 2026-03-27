<script lang="ts">
	import { Spinner } from '$ui/spinner';
	import { WizardStep } from '$wizard/enums';
	import type { WizardScheduler } from '$wizard/services/wizard_scheduler.svelte';
	import {
		Binary,
		Bug,
		Calendar,
		Check,
		Clock,
		Coffee,
		RotateCcw,
		WandSparkles,
		XIcon
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import TimeSpreadDialog from './TimeSpreadDialog.svelte';

	const {
		context,
		machine,
		id
	}: ReturnType<WizardScheduler['createProcessStateMachine']> = $props();

	function statusFromStep(step: WizardStep) {
		switch (step) {
			case WizardStep.INITIALISING:
				return { icon: Coffee, label: 'Initialiserung...' };
			case WizardStep.PROCESSING:
				return { icon: Binary, label: 'Verarbeitung...' };
			case WizardStep.BATCH_PENDING:
				return { icon: Clock, label: 'Warte auf andere Dateien...' };
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

<div
	data-testid="wizard-file"
	class="bg-muted flex flex-col gap-y-4 rounded-md p-4"
>
	<div class="flex h-full w-full flex-row items-center justify-between gap-x-4">
		<span data-testid="wizard-file-name" class="truncate overflow-hidden"
			>{context.file.name}</span
		>
		<div class="flex flex-row gap-x-2">
			{#if $machine === WizardStep.WAITING}
				<TimeSpreadDialog
					{id}
					onClose={() => {
						if ((context.dateRanges?.ranges?.length ?? 0) > 0) {
							machine.next();
						}
					}}
					onValidChange={(data) => (context.dateRanges = data)}
				/>
			{/if}
			{#if $machine === WizardStep.WAITING || $machine === WizardStep.INITIALISING}
				<Button
					variant="destructive"
					onclick={() => {
						context.cancelled = true;
						machine.next();
					}}><XIcon /></Button
				>
			{/if}
			{#if $machine === WizardStep.CANCELLED}
				<Button
					variant="default"
					onclick={() => {
						context.cancelled = false;
						machine.next({ context, machine, id });
					}}><RotateCcw /></Button
				>
			{/if}
		</div>
	</div>
	<div class="flex flex-row justify-between">
		<div class="flex flex-row items-center gap-x-1">
			{#if $machine === WizardStep.ERROR}
				<Tooltip.Provider delayDuration={100}>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Badge variant="default" class="gap-x-2">
								<Icon size={18} /><span class="text-sm font-medium"
									>{label}</span
								>
							</Badge>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p class="bg-background max-w-96">{context.error!.message}</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			{:else}
				<Badge
					data-testid="wizard-file-status"
					variant="default"
					class="gap-x-2"
				>
					<Icon size={18} /><span class="text-sm font-medium">{label}</span>
				</Badge>
			{/if}
		</div>
		{#if $machine === WizardStep.PROCESSING || $machine === WizardStep.AI_COMPLETION || $machine === WizardStep.TIME_SPREADING}
			<Spinner size="sm" />
		{/if}
	</div>
</div>

<script lang="ts">
	import type { WizardMediator } from '$wizard/services/wizard_mediator.svelte';

	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import ErrorAlert from '$ui/ErrorAlert.svelte';
	import { Spinner } from '$ui/spinner';
	import { WizardStep } from '$wizard/enums';
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

	import TimeSpreadDialog from './TimeSpreadDialog.svelte';

	const {
		cancel,
		confirmDateRanges,
		context,
		id,
		machine,
		restart
	}: ReturnType<WizardMediator['createProcessStateMachine']> = $props();

	function statusFromStep(step: WizardStep) {
		switch (step) {
			case WizardStep.AI_COMPLETION:
				return { icon: WandSparkles, label: 'KI-Umformulierung...' };
			case WizardStep.BATCH_PENDING:
				return { icon: Clock, label: 'Warte auf andere Dateien...' };
			case WizardStep.CANCELLED:
				return { icon: XIcon, label: 'Abgebrochen' };
			case WizardStep.DONE:
				return { icon: Check, label: 'Fertig' };
			case WizardStep.ERROR:
				return { icon: Bug, label: 'Fehler' };
			case WizardStep.INITIALISING:
				return { icon: Coffee, label: 'Initialiserung...' };
			case WizardStep.PROCESSING:
				return { icon: Binary, label: 'Verarbeitung...' };
			case WizardStep.TIME_SPREADING:
				return { icon: Calendar, label: 'Zeitliche Verteilung...' };
			case WizardStep.WAITING:
				return { icon: Clock, label: 'Warten auf Eingabe' };
		}
	}

	let step = $derived(machine.current);

	let { icon: Icon, label } = $derived.by(() => statusFromStep(step));
</script>

<div
	data-testid="wizard-file"
	class="bg-muted flex flex-col gap-y-4 rounded-md p-4"
>
	<div class="flex h-full w-full flex-row items-center justify-between gap-x-4">
		<span data-testid="wizard-file-name" class="truncate overflow-hidden"
			>{'url' in context.entry
				? context.entry.url
				: context.entry.file.name}</span
		>
		<div class="flex flex-row gap-x-2">
			{#if step === WizardStep.WAITING}
				<TimeSpreadDialog
					{id}
					onClose={confirmDateRanges}
					onValidChange={(data) => (context.dateRanges = data)}
				/>
			{/if}
			{#if step === WizardStep.WAITING || step === WizardStep.INITIALISING}
				<Button variant="destructive" onclick={cancel}><XIcon /></Button>
			{/if}
			{#if step === WizardStep.CANCELLED}
				<Button variant="default" onclick={restart}><RotateCcw /></Button>
			{/if}
		</div>
	</div>
	<div class="flex flex-row justify-between">
		<div class="flex flex-row items-center gap-x-1">
			{#if step === WizardStep.ERROR}
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
							<ErrorAlert class="border-none" error={context.error!} />
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
		{#if step === WizardStep.PROCESSING || step === WizardStep.AI_COMPLETION || step === WizardStep.TIME_SPREADING}
			<Spinner size="sm" />
		{/if}
	</div>
</div>

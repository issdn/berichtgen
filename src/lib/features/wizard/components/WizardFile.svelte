<script lang="ts">
	import type { WizardMediator } from '$wizard/services/wizard_mediator.svelte';

	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
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

	import ErrorModal from './ErrorModal.svelte';
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
	let errorModalOpen = $state(false);

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
			{#if step !== WizardStep.PROCESSING && step !== WizardStep.AI_COMPLETION && step !== WizardStep.CANCELLED && step !== WizardStep.DONE}
				<Button
					data-testid="wizard-file-cancel"
					variant="destructive"
					onclick={cancel}><XIcon /></Button
				>
			{/if}
			{#if step === WizardStep.CANCELLED}
				<Button
					data-testid="wizard-file-restart"
					variant="default"
					onclick={restart}><RotateCcw /></Button
				>
			{/if}
		</div>
	</div>
	<div class="flex flex-row justify-between">
		<div class="flex flex-row items-center gap-x-1">
			{#if step === WizardStep.ERROR}
				<Badge
					data-testid="wizard-file-status"
					variant="default"
					class="cursor-pointer gap-x-2"
					onclick={() => (errorModalOpen = true)}
				>
					<Icon size={18} /><span class="text-sm font-medium">{label}</span>
				</Badge>
				<ErrorModal bind:open={errorModalOpen} error={context.error!} />
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

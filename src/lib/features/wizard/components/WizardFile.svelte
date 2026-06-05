<script lang="ts">
	import type { WizardMediator } from '$wizard/services/wizard_mediator.svelte';
	import type { TimeSpreadResult } from '$wizard/types';

	import { page } from '$app/state';
	import { AsyncResource } from '$core/async.svelte';
	import berichtgenStore from '$core/stores/berichtgen.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as HoverCard from '$lib/components/ui/hover-card/index.js';
	import { Spinner } from '$ui/spinner';
	import { WizardStep } from '$wizard/enums';
	import {
		getPreferredTemplateBytes,
		getWizardDownloadFilename,
		type WizardDownloadType
	} from '$wizard/write/download';
	import { handleDOCXDownload } from '$wizard/write/write_docx';
	import { handleJSONDownload } from '$wizard/write/write_json';
	import {
		Binary,
		Bug,
		Calendar,
		Check,
		Clock,
		Coffee,
		FileDown,
		FileJson,
		FileType,
		RotateCcw,
		Trash,
		WandSparkles,
		XIcon
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	import ErrorDialog from './ErrorDialog.svelte';
	import TimeSpreadDialog from './TimeSpreadDialog.svelte';

	const {
		cancel,
		confirmDateRanges,
		context,
		id,
		machine,
		remove,
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
	let errorDialogOpen = $state(false);
	let showRemoveButton = $derived(
		step === WizardStep.INITIALISING ||
			step === WizardStep.PROCESSING ||
			step === WizardStep.WAITING ||
			step === WizardStep.BATCH_PENDING
	);
	let showCancelButton = $derived(
		step === WizardStep.TIME_SPREADING || step === WizardStep.DONE
	);
	let showDownloadButton = $derived(step === WizardStep.DONE);
	let downloadHoverOpen = $state(false);
	let preferredDownloadType = $derived(
		berichtgenStore.get('preferredWizardDownloadType')
	);

	const downloadJSON = new AsyncResource(
		async () => {
			handleJSONDownload(
				context.snapshot as TimeSpreadResult,
				getWizardDownloadFilename({
					name: context.file.name,
					type: 'json'
				})
			);
		},
		{
			onError: (error) => {
				toast.error(error.message, {
					description: error.cause
				});
			}
		}
	);

	let DownloadIcon = $derived.by(() => {
		if (preferredDownloadType === 'json') return FileJson;
		if (preferredDownloadType === 'docx') return FileType;
		return FileDown;
	});
	let { icon: Icon, label } = $derived.by(() => statusFromStep(step));

	const downloadDOCX = new AsyncResource(
		async () => {
			const template = await getPreferredTemplateBytes({
				preferredTemplatePath: berichtgenStore.get('preferredTemplatePath'),
				supabase: page.data.supabase
			});

			await handleDOCXDownload({
				entries: Promise.resolve(context.snapshot as TimeSpreadResult),
				filename: getWizardDownloadFilename({
					name: context.file.name,
					type: 'docx'
				}),
				template,
				userMetadata: page.data.userMetadata
			});
		},
		{
			onError: (error) => {
				if (error.code === 'PREFERRED_TEMPLATE_DELETED') {
					berichtgenStore.set('preferredTemplatePath', null);
				}
				toast.error(error.message, {
					description: error.cause
				});
			}
		}
	);

	let isDownloading = $derived(downloadJSON.loading || downloadDOCX.loading);

	function selectDownloadType(type: WizardDownloadType) {
		berichtgenStore.set('preferredWizardDownloadType', type);
		downloadHoverOpen = false;
		if (type === 'json') {
			void downloadJSON.execute();
			return;
		}
		void downloadDOCX.execute();
	}

	function downloadWithPreferredType() {
		if (preferredDownloadType === 'json') {
			void downloadJSON.execute();
			return;
		}
		if (preferredDownloadType === 'docx') {
			void downloadDOCX.execute();
		}
	}
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
			{#if step === WizardStep.WAITING || step === WizardStep.BATCH_PENDING}
				<TimeSpreadDialog
					{id}
					onClose={confirmDateRanges}
					onValidChange={(data) => (context.dateRanges = data)}
				/>
			{/if}
			{#if showRemoveButton}
				<Button
					data-testid="wizard-file-remove"
					variant="destructive"
					onclick={remove}><Trash /></Button
				>
			{/if}
			{#if showCancelButton}
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
			{#if showDownloadButton}
				<HoverCard.Root
					bind:open={downloadHoverOpen}
					openDelay={0}
					closeDelay={0}
				>
					<HoverCard.Trigger>
						<Button
							data-testid="wizard-file-download"
							variant="default"
							disabled={isDownloading}
							onclick={downloadWithPreferredType}
						>
							{#if isDownloading}
								<Spinner size="sm" />
							{:else}
								<DownloadIcon />
							{/if}
						</Button>
					</HoverCard.Trigger>
					<HoverCard.Content class="w-fit">
						<div class="flex flex-col gap-y-2">
							<Button
								variant="ghost"
								class="justify-start"
								onclick={() => selectDownloadType('json')}
							>
								<FileJson />
								Als JSON herunterladen
							</Button>
							<Button
								variant="ghost"
								class="justify-start"
								onclick={() => selectDownloadType('docx')}
							>
								<FileType />
								Als Word herunterladen
							</Button>
						</div>
					</HoverCard.Content>
				</HoverCard.Root>
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
					onclick={() => (errorDialogOpen = true)}
				>
					<Icon size={18} /><span class="text-sm font-medium">{label}</span>
				</Badge>
				<ErrorDialog bind:open={errorDialogOpen} error={context.error!} />
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

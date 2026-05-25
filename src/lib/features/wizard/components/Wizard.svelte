<script lang="ts">
	import type { WizardProcessStateMachine } from '$wizard/types';

	import { page } from '$app/state';
	import { AsyncResource } from '$core/async.svelte';
	import berichtgenStore from '$core/stores/berichtgen.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { buttonVariants } from '$ui/button';
	import { Spinner } from '$ui/spinner';
	import Docx from '$ui/svg/DOCX.svelte';
	import Pdf from '$ui/svg/PDF.svelte';
	import Png from '$ui/svg/PNG.svelte';
	import { checkPreferredTemplate } from '$wizard/api/wizard.remote';
	import { wizardMediatorContext } from '$wizard/services/wizard_mediator.svelte';
	import { handleDOCXDownload } from '$wizard/write/write_docx';
	import { handleJSONDownload } from '$wizard/write/write_json';
	import {
		FileCheck2,
		FileClock,
		FileJson,
		FileType,
		Play
	} from '@lucide/svelte';
	import { type DndEvent, dndzone } from 'svelte-dnd-action';
	import { toast } from 'svelte-sonner';
	import { flip } from 'svelte/animate';

	import WizardFile from './WizardFile.svelte';
	import WizardRestoreSessionDialog from './WizardRestoreSessionDialog.svelte';
	import WizardSettingsPopover from './WizardSettingsPopover.svelte';

	const wizardMediator = wizardMediatorContext.get();

	let hasAnyResult = $state(false);

	let flushLoading = $state(false);

	let canRunFlush = $derived((wizardMediator.filesStates?.waiting ?? 0) > 0);

	$effect(() => {
		if (wizardMediator.result !== null) {
			wizardMediator.result?.then((items) => {
				if (items.length > 0) {
					hasAnyResult = true;
				}
			});
		}
	});

	function handleDndConsider(
		e: CustomEvent<DndEvent<WizardProcessStateMachine>>
	) {
		wizardMediator.schedule = e.detail.items;
	}

	function handleDndFinalize(
		e: CustomEvent<DndEvent<WizardProcessStateMachine>>
	) {
		wizardMediator.schedule = e.detail.items;
	}

	async function flushAiCompletion() {
		flushLoading = true;
		await wizardMediator.flushAiCompletion();
		flushLoading = false;
	}

	const downloadJSON = new AsyncResource(
		async () => {
			await handleJSONDownload(wizardMediator.result!);
		},
		{
			onError: (error) => {
				toast.error('JSON konnte nicht heruntergeladen werden.', {
					description: error.cause ?? error.message
				});
			}
		}
	);

	const downloadDOCX = new AsyncResource(
		async () => {
			const path = berichtgenStore.get('preferredTemplatePath');
			if (!path) {
				toast.error(
					'Keine bevorzugte Vorlage ausgewählt. Bitte wähle eine Vorlage aus den Einstellungen aus.'
				);
				return;
			}
			const { exists } = await checkPreferredTemplate({
				storagePath: path
			});
			if (!exists) {
				berichtgenStore.set('preferredTemplatePath', null);
				toast.info(
					'Deine bevorzugte Vorlage wurde gelöscht. Bitte wähle eine neue Vorlage aus.',
					{ closeButton: true, dismissable: true }
				);
				return;
			}
			const templateResult = await page.data.supabase.storage
				.from('templates')
				.download(path);
			if (!templateResult.data) {
				toast.error(
					'Vorlage existiert nicht. Bitte wähle eine andere Vorlage aus.'
				);
				return;
			}
			const uintarray = new Uint8Array(await templateResult.data.arrayBuffer());
			await handleDOCXDownload({
				entries: wizardMediator.result!,
				template: uintarray,
				userMetadata: page.data.userMetadata
			});
		},
		{
			onError: (error) => {
				toast.error('DOCX konnte nicht heruntergeladen werden.', {
					description: error.cause ?? error.message
				});
			}
		}
	);
</script>

<div
	data-testid="wizard-container"
	class="relative flex h-96 min-h-0 w-full flex-col overflow-hidden rounded-lg border-4 md:h-full"
>
	<div
		data-testid="wizard-header"
		class="bg-muted flex flex-row flex-wrap items-center justify-between gap-x-4 p-4"
	>
		<div class="flex flex-row items-center gap-x-4">
			<WizardSettingsPopover />
		</div>
		<div class="flex flex-row gap-x-2">
			<Button
				variant="default"
				disabled={flushLoading || !canRunFlush}
				onclick={flushAiCompletion}
				data-testid="wizard-flush-button"
			>
				{#if flushLoading}
					<Spinner size="sm" />
				{:else}
					<Play />
				{/if}
				Ausführen
			</Button>
			<Dialog.Root open={hasAnyResult}>
				<Dialog.Trigger
					class={buttonVariants({ variant: 'default' })}
					data-testid="wizard-completion-button"
					disabled={!hasAnyResult}><FileCheck2 /></Dialog.Trigger
				>
				<Dialog.Content {children} {childrenBehind} class="max-w-min" />
			</Dialog.Root>
		</div>
	</div>
	{#if wizardMediator.schedule !== null && wizardMediator.processInit !== null}
		{#await wizardMediator.processInit}
			<div data-testid="wizard-loading" class="center-absolute translate-y-0.5">
				<Spinner />
			</div>
		{:then}
			{@const items = wizardMediator.schedule.flat()}
			<div
				id="wizard-content"
				class="flex min-h-0 w-full flex-1 flex-col gap-y-2 overflow-y-auto p-4"
				use:dndzone={{ dropTargetStyle: {}, flipDurationMs: 300, items }}
				onconsider={handleDndConsider}
				onfinalize={handleDndFinalize}
			>
				{#each items as file (file.id)}
					<div class="w-full" animate:flip={{ duration: 300 }}>
						<WizardFile {...file} />
					</div>
				{/each}
			</div>
		{/await}
	{:else}
		<FileClock
			data-testid="wizard-empty-state"
			class="center-absolute text-muted size-12 translate-y-0.5"
		/>
	{/if}
</div>

{#snippet children()}
	<Dialog.Header>
		<Dialog.Title>Deine Dateien sind fertig!</Dialog.Title>
	</Dialog.Header>
	<div class="flex w-full flex-col items-center py-4">
		<div class="flex w-fit flex-col gap-y-2">
			<Button
				onclick={downloadJSON.execute}
				disabled={!hasAnyResult || downloadJSON.loading}
				data-testid="wizard-json-download"
			>
				{#if downloadJSON.loading}
					<Spinner size="sm" />
				{:else}
					<FileJson />Als JSON herunterladen
				{/if}
			</Button>
			<Button
				onclick={downloadDOCX.execute}
				disabled={!hasAnyResult || downloadDOCX.loading}
			>
				{#if downloadDOCX.loading}
					<Spinner size="sm" />
				{:else}
					<FileType />Als DOCX herunterladen
				{/if}
			</Button>
		</div>
	</div>
{/snippet}

<svelte:boundary>
	{@const persistedSession = await wizardMediator.persistedSessionPromise}
	{#if persistedSession !== null}
		<WizardRestoreSessionDialog session={persistedSession} />
	{/if}
	{#snippet pending()}
		<!-- no-op pending UI for initial persisted-session lookup -->
	{/snippet}
</svelte:boundary>

{#snippet childrenBehind()}
	<Png class="absolute -top-32 left-[calc(50%-75px)] -z-10 -translate-x-1/2" />
	<Docx class="absolute -top-32 left-[calc(50%)] -z-10 -translate-x-1/2" />
	<Pdf class="absolute -top-32 left-[calc(50%+75px)] -z-10 -translate-x-1/2" />
{/snippet}

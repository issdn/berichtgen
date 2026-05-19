<script lang="ts">
	import { AsyncResource } from '$core/async.svelte';
	import berichtgenStore from '$core/stores/berichtgen.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { checkPreferredTemplate } from '$wizard/api/wizard.remote';
	import { buttonVariants } from '$ui/button';
	import { Spinner } from '$ui/spinner';
	import { wizardMediator } from '$wizard/services/wizard_mediator.svelte';
	import { handleDOCXDownload } from '$wizard/write/write_docx';
	import { handleJSONDownload } from '$wizard/write/write_json';
	import { FileCheck2, FileClock, FileJson, FileType } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { flip } from 'svelte/animate';
	import WizardFile from './WizardFile.svelte';
	import WizardSettingsPopover from './WizardSettingsPopover.svelte';
	import type { WizardProcessStateMachine } from '$wizard/types';
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import * as pdf from 'pdfjs-dist/legacy/build/pdf.mjs';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import Docx from '$ui/svg/DOCX.svelte';
	import Pdf from '$ui/svg/PDF.svelte';
	import Png from '$ui/svg/PNG.svelte';
	import { page } from '$app/state';
	import * as AlertDialog from '$ui/alert-dialog';
	import type { WizardPersistedSession } from '$wizard/services/types';

	onMount(() => {
		if (typeof window !== 'undefined' && typeof document !== 'undefined') {
			import('pdfjs-dist/build/pdf.worker.min?url')
				.then((pdfWorkerURL) => {
					pdf.GlobalWorkerOptions.workerSrc = new URL(
						pdfWorkerURL.default,
						import.meta.url
					).toString();
				})
				.catch(() =>
					toast.error(
						'Fehler beim Laden des PDF-Workers. Stelle sicher, dass du eine Internetverbindung hast.'
					)
				);
		}
	});

	let dialogOpen = $state(false);
	let restoreDismissed = $state(false);

	wizardMediator.setUserKey(page.data.user?.id);
	const persistedSessionPromise = wizardMediator.loadPersistedSession();

	let result = $derived(wizardMediator.result);

	$effect(() => {
		if (result !== null && wizardMediator.isDone) {
			dialogOpen = true;
		}
	});

	async function discardRestoredSession() {
		restoreDismissed = true;
		await wizardMediator.clearPersistedSession();
	}

	function restoreSession(session: WizardPersistedSession) {
		wizardMediator.processInit = wizardMediator.init(session);
		restoreDismissed = true;
	}

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
					'Keine bevorzugte Vorlage ausgew\u00e4hlt. Bitte w\u00e4hle eine Vorlage aus den Einstellungen aus.'
				);
				return;
			}
			const { exists } = await checkPreferredTemplate({
				storagePath: path
			});
			if (!exists) {
				berichtgenStore.set('preferredTemplatePath', null);
				toast.info(
					'Deine bevorzugte Vorlage wurde gel\u00f6scht. Bitte w\u00e4hle eine neue Vorlage aus.',
					{ closeButton: true, dismissable: true }
				);
				return;
			}
			const templateResult = await page.data.supabase.storage
				.from('templates')
				.download(path);
			if (!templateResult.data) {
				toast.error(
					'Vorlage existiert nicht. Bitte w\u00e4hle eine andere Vorlage aus.'
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

	const downloadDisabled = $derived(
		wizardMediator.isRunning || !wizardMediator.result
	);
</script>

<div
	data-testid="wizard-container"
	class="relative flex h-96 w-full flex-col overflow-hidden rounded-lg border-4 md:h-full"
>
	<div
		data-testid="wizard-header"
		class="bg-muted flex flex-row flex-wrap items-center justify-between gap-x-4 p-4"
	>
		<div class="flex flex-row items-center gap-x-4">
			<WizardSettingsPopover />
		</div>
		<Dialog.Root bind:open={dialogOpen}>
			<Dialog.Trigger
				class={buttonVariants({ variant: 'default' })}
				data-testid="wizard-completion-button"
				disabled={result === null}><FileCheck2 /></Dialog.Trigger
			>
			<Dialog.Content {children} {childrenBehind} class="max-w-min" />
		</Dialog.Root>
	</div>
	<div
		data-testid="wizard-content"
		class="h-full overflow-x-hidden overflow-y-auto"
	>
		<div class="relative h-full p-4">
			{#if wizardMediator.schedule !== null && wizardMediator.processInit !== null}
				{#await wizardMediator.processInit}
					<div data-testid="wizard-loading" class="center-absolute">
						<Spinner />
					</div>
				{:then}
					{@const items = wizardMediator.schedule.flat()}
					<div
						class="flex h-full w-full flex-col gap-y-2"
						use:dndzone={{ items, flipDurationMs: 300, dropTargetStyle: {} }}
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
					class="center-absolute text-muted size-12"
				/>
			{/if}
		</div>
	</div>
</div>

{#snippet children()}
	<Dialog.Header>
		<Dialog.Title>Deine Dateien sind fertig!</Dialog.Title>
	</Dialog.Header>
	<div class="flex w-full flex-col items-center py-4">
		<div class="flex w-fit flex-col gap-y-2">
			<Button
				onclick={downloadJSON.execute}
				disabled={downloadDisabled || downloadJSON.loading}
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
				disabled={downloadDisabled || downloadDOCX.loading}
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
	{@const persistedSession = await persistedSessionPromise}
	{#if persistedSession !== null && !restoreDismissed}
		<AlertDialog.Root open={true}>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>Vorherige Sitzung gefunden</AlertDialog.Title>
					<AlertDialog.Description>
						{persistedSession.files.length} Dateien, zuletzt gespeichert am&nbsp;
						{new Date(persistedSession.updatedAt).toLocaleString()}.
					</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<AlertDialog.Cancel onclick={discardRestoredSession}>
						Verwerfen
					</AlertDialog.Cancel>
					<AlertDialog.Action onclick={() => restoreSession(persistedSession)}
						>Fortsetzen</AlertDialog.Action
					>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>
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

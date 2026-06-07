<script lang="ts">
	import type { WizardProcessStateMachine } from '$wizard/types';

	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { AsyncResource } from '$core/async.svelte';
	import { appendConsentLogCommand } from '$core/auth/api/consent.remote';
	import berichtgenStore from '$core/stores/berichtgen.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import {
		INLINE_MAX_BYTES,
		VERTEX_AI_CONSENT_SOURCE_WIZARD,
		VERTEX_AI_CONSENT_TYPE
	} from '$lib/constants';
	import { BerichtgenError } from '$lib/errors';
	import { buttonVariants } from '$ui/button';
	import { Spinner } from '$ui/spinner';
	import Docx from '$ui/svg/DOCX.svelte';
	import Pdf from '$ui/svg/PDF.svelte';
	import Png from '$ui/svg/PNG.svelte';
	import { FileTypes } from '$wizard/enums';
	import { EFileRoutingError } from '$wizard/errors';
	import { combineJSONs } from '$wizard/postprocess/combine';
	import { genaiCompletionSchema } from '$wizard/schemas';
	import { WizardFile as WizardEntryFile } from '$wizard/services/wizard_file';
	import { WizardFileContext } from '$wizard/services/wizard_file_context';
	import { wizardMediatorContext } from '$wizard/services/wizard_mediator.svelte';
	import { getPreferredTemplateBytes } from '$wizard/write/download';
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
	import WizardManualInputDialog from './WizardManualInputDialog.svelte';
	import WizardRestoreSessionDialog from './WizardRestoreSessionDialog.svelte';
	import WizardSettingsPopover from './WizardSettingsPopover.svelte';
	import WizardVertexAiConsentDialog from './WizardVertexAiConsentDialog.svelte';

	const wizardMediator = wizardMediatorContext.get();

	let flushLoading = $state(false);
	let consentDialogOpen = $state(false);
	let canRunFlush = $derived(
		(wizardMediator.filesStates?.batch_pending ?? 0) > 0 &&
			(wizardMediator.filesStates?.process ?? 0) === 0
	);
	let atLeastOneFileDone = $derived(
		(wizardMediator.filesStates?.done ?? 0) > 0
	);

	function toWizardEntry({
		index,
		value
	}: {
		index: number;
		value: string;
	}): File | null {
		const trimmed = value.trim();
		if (!trimmed) return null;
		const completionJson = parseGenaiCompletionJson(trimmed);
		if (completionJson !== null) {
			return WizardEntryFile.fromFile({
				file: new File(
					[JSON.stringify(completionJson)],
					`manueller-json-${index + 1}.json`,
					{
						type: FileTypes.JSON
					}
				)
			});
		}
		if (URL.canParse(trimmed)) {
			return WizardEntryFile.fromUrl({ url: trimmed });
		}
		const bytes = new TextEncoder().encode(trimmed);
		if (bytes.byteLength > INLINE_MAX_BYTES) {
			throw new BerichtgenError({
				...EFileRoutingError.INLINE_TXT_TOO_LARGE,
				cause: `Text ${index + 1} �berschreitet 400 KB.`
			});
		}
		return WizardEntryFile.fromFile({
			file: new File([trimmed], `manueller-text-${index + 1}.txt`, {
				type: FileTypes.TXT
			})
		});
	}

	function parseGenaiCompletionJson(text: string): null | string[] {
		let parsedResult: unknown;
		try {
			parsedResult = JSON.parse(text) as unknown;
		} catch {
			return null;
		}
		const validated = genaiCompletionSchema.safeParse(parsedResult);
		return validated.success ? validated.data : null;
	}

	async function addManualInputsToWizard(values: string[]) {
		if (!page.data.loggedIn) {
			toast.error('Du musst angemeldet sein um Text oder URLs zu verarbeiten.');
			return;
		}

		const entries: File[] = [];
		try {
			for (let index = 0; index < values.length; index++) {
				const entry = toWizardEntry({ index, value: values[index] });
				if (entry !== null) entries.push(entry);
			}
		} catch (error) {
			toast.error((error as Error).message);
			return;
		}
		if (entries.length === 0) {
			toast.error('Bitte gib mindestens einen Text oder eine URL ein.');
			return;
		}

		if (
			wizardMediator.schedule === null ||
			wizardMediator.processInit === null
		) {
			wizardMediator.processInit = (async () => {
				await wizardMediator.clearPersistedSession();
				await wizardMediator.init();
				const initial = entries.map((entry) =>
					wizardMediator.createProcessStateMachine(new WizardFileContext(entry))
				);
				for (const process of initial) {
					process.machine.send('next');
				}
				wizardMediator.schedule = initial;
				wizardMediator.persistSoon();
			})();
		} else {
			const appended = entries.map((entry) =>
				wizardMediator.createProcessStateMachine(new WizardFileContext(entry))
			);
			for (const process of appended) {
				process.machine.send('next');
			}
			wizardMediator.schedule = [...wizardMediator.schedule, ...appended];
			wizardMediator.persistSoon();
		}
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

	async function flushAiCompletion() {
		if (!page.data.vertexAiConsentGranted) {
			consentDialogOpen = true;
			return;
		}
		await runAiCompletion();
	}

	async function runAiCompletion() {
		flushLoading = true;
		await wizardMediator.flushAiCompletion();
		flushLoading = false;
	}

	const acceptVertexAiConsent = new AsyncResource(
		async () => {
			await appendConsentLogCommand({
				appVersion: __APP_VERSION__,
				consentType: VERTEX_AI_CONSENT_TYPE,
				source: VERTEX_AI_CONSENT_SOURCE_WIZARD,
				status: 'granted'
			});
			await invalidate('user:vertexAiConsent');
			consentDialogOpen = false;
			await runAiCompletion();
		},
		{
			onError: (error) => {
				toast.error(error.message, {
					description: error.cause
				});
			}
		}
	);

	const downloadJSON = new AsyncResource(
		async () => {
			const combined = combineJSONs(
				wizardMediator.schedulerState.getFinishedDirectories(),
				berichtgenStore.get('constantHours')
			);
			handleJSONDownload(combined);
		},
		{
			onError: (error) => {
				toast.error(error.message, {
					description: error.cause
				});
			}
		}
	);

	const downloadDOCX = new AsyncResource(
		async () => {
			const path = berichtgenStore.get('preferredTemplatePath');
			const template = await getPreferredTemplateBytes({
				preferredTemplatePath: path,
				supabase: page.data.supabase
			});
			const combined = combineJSONs(
				wizardMediator.schedulerState.getFinishedDirectories(),
				berichtgenStore.get('constantHours')
			);
			await handleDOCXDownload({
				entries: Promise.resolve(combined),
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
			<Dialog.Root open={atLeastOneFileDone}>
				<Dialog.Trigger
					class={buttonVariants({ variant: 'ghost' })}
					data-testid="wizard-completion-button"
					disabled={!atLeastOneFileDone}><FileCheck2 /></Dialog.Trigger
				>
				<Dialog.Content
					data-testid="wizard-dialog-content"
					{children}
					{childrenBehind}
					class="max-w-min"
				/>
			</Dialog.Root>
			<WizardManualInputDialog onSubmit={addManualInputsToWizard} />
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

<WizardVertexAiConsentDialog
	bind:open={consentDialogOpen}
	onAccept={acceptVertexAiConsent.execute}
	pending={acceptVertexAiConsent.loading}
/>

{#snippet children()}
	<Dialog.Header>
		<Dialog.Title>Deine Dateien sind fertig!</Dialog.Title>
	</Dialog.Header>
	<div class="flex w-full flex-col items-center py-4">
		<div class="flex w-fit flex-col gap-y-2">
			<Button
				onclick={downloadJSON.execute}
				disabled={!atLeastOneFileDone || downloadJSON.loading}
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
				disabled={!atLeastOneFileDone || downloadDOCX.loading}
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

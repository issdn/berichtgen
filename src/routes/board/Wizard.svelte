<script lang="ts">
	import WizardFile from './WizardFile.svelte';
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import { FileCheck2, FileClock, FileJson, FileType } from '@lucide/svelte';
	import { getContext, onMount } from 'svelte';
	import * as pdf from 'pdfjs-dist/legacy/build/pdf.mjs';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import Docx from '$src/lib/svg/DOCX.svelte';
	import Pdf from '$src/lib/svg/PDF.svelte';
	import Png from '$src/lib/svg/PNG.svelte';
	import FileDownloadButton from '$src/lib/components/FileDownloadButton.svelte';
	import { handleDOCXDownload } from '$src/lib/utils/write_docx';
	import { handleJSONDownload } from '$src/lib/utils/write_json';
	import WizardSettingsPopover from '$src/lib/components/WizardSettingsPopover.svelte';
	import type { UserContext, WizardProcessStateMachine } from '$src/lib/types';
	import { toast } from 'svelte-sonner';
	import Spinner from '$src/lib/components/ui/Spinner.svelte';
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import { checkPreferredTemplate } from '$src/lib/utils/template_utils';

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

	let getUser = getContext<UserContext>('user');
	let getBoard = getContext<() => { userMetadata: { fullName: string | null; ausbildungsberuf: string | null; abteilung: string | null } | null }>('board');

	let { supabase } = $derived(getUser());
	let { userMetadata } = $derived(getBoard());

	let dialogOpen = $state(false);

	let result = $derived(wizardScheduler.result);

	$effect(() => {
		if (result !== null && wizardScheduler.filesReady - wizardScheduler.filesUnfinished > 0) {
			dialogOpen = true;
		}
	});

	function handleDndConsider(e: CustomEvent<DndEvent<WizardProcessStateMachine>>) {
		wizardScheduler.schedule = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent<DndEvent<WizardProcessStateMachine>>) {
		wizardScheduler.schedule = e.detail.items;
	}
</script>

<div class="relative flex h-full w-full flex-col overflow-hidden rounded-lg border-4">
	<div class="bg-muted flex flex-row flex-wrap items-center justify-between gap-x-4 p-4">
		<div class="flex flex-row items-center gap-x-4">
			<WizardSettingsPopover />
		</div>
		{#if result !== null}
			<Dialog.Root bind:open={dialogOpen}>
				<Dialog.Trigger class={buttonVariants({ variant: 'default' })}
					><FileCheck2 /></Dialog.Trigger
				>
				<Dialog.Content {children} {childrenBehind} class="max-w-min" />
			</Dialog.Root>
		{:else}
			<Button disabled={true}><FileCheck2 /></Button>
		{/if}
	</div>
	<div class="h-full overflow-x-hidden overflow-y-auto">
		<div class="relative p-4 h-full">
			{#if wizardScheduler.schedule !== null && wizardScheduler.processInit !== null}
				{#await wizardScheduler.processInit}
					<div class="center-absolute"><Spinner /></div>
				{:then}
					{@const items = wizardScheduler.schedule.flat()}
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
				<FileClock class="center-absolute text-muted size-12"/>
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
			<FileDownloadButton
				fn={() => handleJSONDownload(wizardScheduler.result!)}
				download="bericht.json"><FileJson />Als JSON herunterladen</FileDownloadButton
			>
			<FileDownloadButton
				fn={async () => {
					const exists = await checkPreferredTemplate(supabase);
					if (!exists) return;

					const path = berichtgenStore.preferedTemplatePath;
					
					const templateResult = await supabase.storage.from('templates').download(path!);
					if(!templateResult.data) {
						toast.error('Vorlage existiert nicht. Bitte wähle eine andere Vorlage aus.');
						return;
					}
					const uintarray = new Uint8Array(await templateResult.data!.arrayBuffer());
					await handleDOCXDownload({ 
						entries: wizardScheduler.result!, 
						template: uintarray,
						userMetadata: userMetadata ?? undefined
					});
				}}
				download="bericht.docx"><FileType />Als DOCX herunterladen</FileDownloadButton
			>
		</div>
	</div>
{/snippet}

{#snippet childrenBehind()}
	<Png class="absolute -top-32 left-[calc(50%-75px)] -z-10 -translate-x-1/2" />
	<Docx class="absolute -top-32 left-[calc(50%)] -z-10 -translate-x-1/2" />
	<Pdf class="absolute -top-32 left-[calc(50%+75px)] -z-10 -translate-x-1/2" />
{/snippet}

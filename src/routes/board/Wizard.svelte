<script lang="ts">
	import WizardFile from './WizardFile.svelte';
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import { FileCheck2, FileJson, FileType } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import * as pdf from 'pdfjs-dist/legacy/build/pdf.mjs';
	import ProviderSelect from './ProviderSelect.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import Docx from '$src/lib/svg/DOCX.svelte';
	import Pdf from '$src/lib/svg/PDF.svelte';
	import Png from '$src/lib/svg/PNG.svelte';
	import FileDownloadButton from '$src/lib/components/FileDownloadButton.svelte';
	import { handleDOCXDownload } from '$src/lib/utils/write_docx';
	import { handleJSONDownload } from '$src/lib/utils/write_json';
	import WizardSettingsPopover from '$src/lib/components/WizardSettingsPopover.svelte';

	onMount(() => {
		if (typeof window !== 'undefined' && typeof document !== 'undefined') {
			import('pdfjs-dist/build/pdf.worker.min?url').then((pdfWorkerURL) => {
				pdf.GlobalWorkerOptions.workerSrc = new URL(
					pdfWorkerURL.default,
					import.meta.url
				).toString();
			});
		}
	});

	let dialogOpen = $state(false);

	let result = $derived(wizardScheduler.result);

	$effect(() => {
		if (
			result !== null &&
			wizardScheduler.filesReady > 0 &&
			wizardScheduler.filesUnfinished !== wizardScheduler.filesReady
		) {
			dialogOpen = true;
		}
	});
</script>

<div class="relative h-full w-full gap-y-8 rounded-lg border-4">
	<div class="flex flex-row flex-wrap items-center justify-between gap-x-4 bg-muted p-4">
		<div class="flex flex-row items-center gap-x-4">
			<ProviderSelect />
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
	<div class="flex min-h-64 flex-col gap-y-1 p-4">
		{#if wizardScheduler.schedule !== null && wizardScheduler.processInit !== null}
			{#await wizardScheduler.processInit then}
				{#each wizardScheduler.schedule as { context, machine }, i}
					{#if i <= wizardScheduler.filesReady + wizardScheduler.batchSize}
						<WizardFile {context} {machine} />
					{:else}
						<span class="overflow-hidden truncate">{context.file.name}</span>
					{/if}
				{/each}
			{/await}
		{/if}
	</div>
</div>

{#snippet children()}
	<Dialog.Header>
		<Dialog.Title>Deine Dateien sind fertig!</Dialog.Title>
	</Dialog.Header>
	<div class="flex w-full flex-col items-center py-4">
		<div class="flex w-fit flex-col gap-y-2">
			<FileDownloadButton fn={(result) => handleJSONDownload(result)} download="bericht.json"
				><FileJson />Als JSON herunterladen</FileDownloadButton
			>
			<FileDownloadButton fn={(result) => handleDOCXDownload(result)} download="bericht.docx"
				><FileType />Als DOCX herunterladen</FileDownloadButton
			>
		</div>
	</div>
{/snippet}

{#snippet childrenBehind()}
	<Png class="absolute -top-32 left-[calc(50%-75px)] -z-10 -translate-x-1/2" />
	<Docx class="absolute -top-32 left-[calc(50%)] -z-10 -translate-x-1/2" />
	<Pdf class="absolute -top-32 left-[calc(50%+75px)] -z-10 -translate-x-1/2" />
{/snippet}

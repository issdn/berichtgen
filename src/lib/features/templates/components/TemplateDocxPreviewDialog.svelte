<script lang="ts">
	import { Button } from '$ui/button';
	import * as Dialog from '$ui/dialog';
	import { type Snippet } from 'svelte';

	import DocxPreview from './DocxPreview.svelte';

	type ConfirmHandler = () => boolean | Promise<boolean | void> | void;

	let {
		confirmDisabled = false,
		confirmLabel,
		description = '',
		fileUrl,
		onConfirm,
		open = $bindable(false),
		secondaryConfirmLabel,
		onSecondaryConfirm,
		title,
		trigger
	}: {
		confirmDisabled?: boolean;
		confirmLabel?: string;
		description?: string;
		fileUrl: string;
		onConfirm?: ConfirmHandler;
		onSecondaryConfirm?: ConfirmHandler;
		open?: boolean;
		secondaryConfirmLabel?: string;
		title: string;
		trigger?: Snippet;
	} = $props();

	const canOpenInWordOnline = $derived(
		fileUrl.startsWith('http://') || fileUrl.startsWith('https://')
	);

	async function handleConfirm() {
		if (!onConfirm) return;
		const result = await onConfirm();
		if (result === false) return;
		open = false;
	}

	async function handleSecondaryConfirm() {
		if (!onSecondaryConfirm) return;
		const result = await onSecondaryConfirm();
		if (result === false) return;
		open = false;
	}
</script>

<Dialog.Root bind:open>
	{#if trigger}
		<Dialog.Trigger>{@render trigger()}</Dialog.Trigger>
	{/if}
	<Dialog.Content
		class="flex h-[calc(100%-6rem)] flex-col overflow-hidden sm:max-w-[calc(100%-6rem)]"
	>
		<Dialog.Header class="shrink-0">
			<Dialog.Title>{title}</Dialog.Title>
			{#if description}
				<Dialog.Description>{description}</Dialog.Description>
			{/if}
		</Dialog.Header>

		<div class="min-h-0 flex-1 overflow-y-scroll pt-2">
			<svelte:boundary>
				<DocxPreview {fileUrl} />
				{#snippet pending()}
					<div class="flex h-full items-center justify-center">
						<div class="text-muted-foreground animate-pulse text-sm">
							Dokument wird geladen...
						</div>
					</div>
				{/snippet}
				{#snippet failed(error)}
					<div class="flex h-full items-center justify-center">
						<div class="text-destructive text-sm">
							Fehler beim Laden: {error instanceof Error
								? error.message
								: String(error)}
						</div>
					</div>
				{/snippet}
			</svelte:boundary>
		</div>

		<div
			class="text-muted-foreground shrink-0 border-t px-6 py-2 text-center text-xs"
		>
			Die Vorschau gibt das Dokument möglicherweise nicht vollständig wieder.
			{#if canOpenInWordOnline}
				Für eine genaue Darstellung öffne die Datei in
				<a
					href="https://docs.google.com/viewer?url={encodeURIComponent(
						fileUrl
					)}"
					target="_blank"
					rel="noopener noreferrer"
					class="underline">Google Docs</a
				>.
			{/if}
		</div>

		{#if confirmLabel || secondaryConfirmLabel}
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (open = false)}>
					Abbrechen
				</Button>
				{#if secondaryConfirmLabel}
					<Button
						variant="secondary"
						disabled={confirmDisabled}
						onclick={handleSecondaryConfirm}
					>
						{secondaryConfirmLabel}
					</Button>
				{/if}
				{#if confirmLabel}
					<Button disabled={confirmDisabled} onclick={handleConfirm}>
						{confirmLabel}
					</Button>
				{/if}
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<script lang="ts">
	import { type Snippet } from 'svelte';
	import { Button } from '$ui/button';
	import * as Dialog from '$ui/dialog';
	import DocxPreview from './DocxPreview.svelte';

	type ConfirmHandler = () => void | boolean | Promise<void | boolean>;

	let {
		open = $bindable(false),
		title,
		description = '',
		fileUrl,
		trigger,
		confirmLabel,
		confirmDisabled = false,
		onConfirm
	}: {
		open?: boolean;
		title: string;
		description?: string;
		fileUrl: string;
		trigger?: Snippet;
		confirmLabel?: string;
		confirmDisabled?: boolean;
		onConfirm?: ConfirmHandler;
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
							Dokument wird geladen…
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
					class="underline">Microsoft Word Online</a
				>.
			{/if}
		</div>

		{#if confirmLabel}
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (open = false)}>
					Abbrechen
				</Button>
				<Button disabled={confirmDisabled} onclick={handleConfirm}>
					{confirmLabel}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

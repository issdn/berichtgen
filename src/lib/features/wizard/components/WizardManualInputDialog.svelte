<script lang="ts">
	import { page } from '$app/state';
	import GlobalPasteHandler from '$lib/components/GlobalPasteHandler.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { buttonVariants } from '$ui/button';
	import { Textarea } from '$ui/textarea';
	import { FileInput } from '@lucide/svelte';
	import { slide } from 'svelte/transition';

	let {
		onSubmit,
		open = $bindable(false)
	}: {
		onSubmit: (values: string[]) => Promise<void> | void;
		open?: boolean;
	} = $props();

	let textareaContainer: HTMLDivElement | null = null;

	let inputs = $state(['']);

	let visualInputs = $derived.by(() => {
		if ((inputs.at(-1)?.length ?? 0) > 0) {
			return [...inputs, ''];
		}

		return inputs;
	});

	function resetManualInputs() {
		inputs = [''];
	}

	function removeEmptyIntermediateOnBlur(index: number) {
		const isLast = index === inputs.length - 1;
		if (isLast) return;
		if (inputs[index]?.trim().length !== 0) return;
		const next = inputs.filter((_, i) => i !== index);
		inputs = next.length > 0 ? next : [''];
	}

	async function submitInputs() {
		await onSubmit(inputs);
		open = false;
	}

	async function handlePaste(e: ClipboardEvent) {
		const active = document.activeElement;
		const isTextareaFocused =
			active instanceof HTMLTextAreaElement &&
			textareaContainer?.contains(active);
		if (isTextareaFocused) return;

		const text = e.clipboardData?.getData('text/plain')?.trim();
		if (!text) return;
		inputs = [...inputs, text];
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(isOpen) => {
		if (!isOpen) resetManualInputs();
	}}
>
	<Dialog.Trigger
		disabled={!page.data.loggedIn}
		class={buttonVariants({ variant: 'outline' })}
		data-testid="wizard-manual-input-trigger"
	>
		<FileInput />
	</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-xl">
		<Dialog.Header>
			<Dialog.Title>Text oder URL hinzufügen</Dialog.Title>
		</Dialog.Header>
		<GlobalPasteHandler {handlePaste}>
			<div
				class="flex max-h-96 flex-col gap-y-2 overflow-y-auto pt-2"
				bind:this={textareaContainer}
			>
				{#each visualInputs as _, index (index)}
					<div transition:slide>
						<Textarea
							data-testid={`wizard-manual-input-${index}`}
							class="min-h-none resize-none"
							bind:value={inputs[index]}
							onblur={() => removeEmptyIntermediateOnBlur(index)}
							placeholder="Text oder https://... eingeben"
						/>
					</div>
				{/each}
			</div>
			<div class="mt-4 flex justify-end gap-x-2">
				<Button variant="ghost" onclick={() => (open = false)}>Abbrechen</Button
				>
				<Button data-testid="wizard-manual-input-submit" onclick={submitInputs}>
					Hinzufügen
				</Button>
			</div>
		</GlobalPasteHandler>
	</Dialog.Content>
</Dialog.Root>

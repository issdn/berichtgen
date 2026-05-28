<script lang="ts">
	import type { DialogRootPropsWithoutHTML } from 'bits-ui';

	import CopyButton from '$core/components/CopyButton.svelte';
	import { toErrorBody } from '$lib/errors';
	import * as Dialog from '$ui/dialog';

	let {
		error,
		open = $bindable(false),
		...rest
	}: DialogRootPropsWithoutHTML & {
		error: unknown;
		open?: boolean;
	} = $props();

	let normalized = $derived(toErrorBody(error));
</script>

<Dialog.Root bind:open {...rest}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="text-destructive">{normalized.message}</Dialog.Title>
			<Dialog.Description>
				{#if normalized.cause}
					<p class="h-32 text-ellipsis">
						{normalized.cause}
						<br />
					</p>
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer
			class="flex w-full flex-row items-center justify-between sm:justify-between"
		>
			<b class="text-muted-foreground">{normalized.code}</b>
			<CopyButton text={normalized.cause ?? normalized.message}
				>Kopieren</CopyButton
			>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

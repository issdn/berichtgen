<script lang="ts">
	import { buttonVariants } from '$ui/button';
	import { FileCode } from '@lucide/svelte';
	import { Dialog } from 'bits-ui';

	import TemplatesDialogContent from './TemplatesDialogContent.svelte';

	let open = $state(false);
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger
		data-testid="templates-dialog-trigger"
		class={buttonVariants({ variant: 'outline' })}
		><FileCode />Vorlagen</Dialog.Trigger
	>
	{#if open}
		<TemplatesDialogContent />
	{/if}
</Dialog.Root>

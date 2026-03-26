<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { buttonVariants } from '$src/lib/components/ui/button';
	import { FileCode } from '@lucide/svelte';
	import TemplatesDialogContent from './TemplatesDialogContent.svelte';
	let open = $state(false);
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger
		data-testid="templates-dialog-trigger"
		class={buttonVariants({ variant: 'outline' })}
		><FileCode />Templates</Dialog.Trigger
	>
	{#if open}
		<TemplatesDialogContent />
	{/if}
</Dialog.Root>

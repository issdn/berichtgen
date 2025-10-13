<script lang="ts">
	import Howto from '$lib/components/Howto.svelte';
	import Wizard from './Wizard.svelte';
	import { goto } from '$app/navigation';
	import { HandCoins } from '@lucide/svelte';
	import { wizardScheduler } from '$src/lib/wizard_scheduler.svelte';
	import WizardDropzone from '$src/lib/components/WizardDropzone.svelte';
	import { Button } from '$src/lib/components/ui/button';
	import TemplatesDialog from '$src/lib/templates/TemplatesDialog.svelte';

	let { data } = $props();

	let { tokenCount, user } = data;
</script>

<svelte:head>
	<title
		>Board - {wizardScheduler.isRunning ? 'In Bearbeitung...' : 'Nix passiert.'} | ***REMOVED***</title
	>
</svelte:head>

<div
	class="h-main flex w-full flex-col gap-x-8 gap-y-8 px-8 pb-8 md:grid md:grid-cols-2 md:grid-rows-2"
>
	<div class="flex h-full flex-col gap-y-2 md:row-span-2">
		<div class="w-full flex-row items-center gap-x-16">
			{#if tokenCount !== null}
				<Button onclick={() => goto('/board/user/kauf')} variant="outline"
					><HandCoins />{tokenCount}</Button
				>
			{/if}
			{#if user !== null}
				<TemplatesDialog />
			{/if}
		</div>
		<Howto />
	</div>
	<WizardDropzone />
	<Wizard />
</div>

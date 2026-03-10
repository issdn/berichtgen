<script lang="ts">
	import Howto from '$lib/components/Howto.svelte';
	import Wizard from './Wizard.svelte';
	import { goto } from '$app/navigation';
	import WizardDropzone from '$src/lib/components/WizardDropzone.svelte';
	import { Button } from '$src/lib/components/ui/button';
	import TemplatesDialog from '$src/lib/templates/TemplatesDialog.svelte';
	import { resolve } from '$app/paths';
	import AnimatedTokenCount from '$src/lib/components/AnimatedTokenCount.svelte';

	let { data } = $props();

	let { tokenCount, user } = $derived(data);
</script>

<svelte:head>
	<title>***REMOVED***</title>
</svelte:head>

<div
	class="h-main flex w-full flex-col gap-x-8 gap-y-8 px-8 pb-8 md:grid md:grid-cols-2 md:grid-rows-2"
>
	<div class="flex h-full flex-col gap-y-2 md:row-span-2">
		<div class="w-full flex-row items-center gap-x-16">
			{#if tokenCount !== null}
				<Button onclick={() => goto(resolve('/board/user/kauf'))} variant="outline">
					<AnimatedTokenCount {tokenCount} />
				</Button>
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

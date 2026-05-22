<script lang="ts">
	import Howto from '$core/components/Howto.svelte';
	import Wizard from '$wizard/components/Wizard.svelte';
	import WizardDropzone from '$wizard/components/WizardDropzone.svelte';
	import TemplatesDialog from '$templates/components/TemplatesDialog.svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$ui/button';
	import { resolve } from '$app/paths';
	import AnimatedTokenCount from '$tokens/components/AnimatedTokenCount.svelte';

	let { data } = $props();

	let { tokenCount } = $derived(data);
</script>

<svelte:head>
	<title>Berichtgen</title>
</svelte:head>

<div class="h-main flex w-full flex-col gap-4 px-4 pb-4 md:flex-row">
	<div class="flex w-full max-w-1/2 flex-col gap-y-4">
		<WizardDropzone />
		<Wizard />
	</div>
	<div class="flex w-full flex-col gap-y-2">
		<div class="h-min w-full flex-row items-center gap-x-16">
			{#if tokenCount !== null}
				<Button
					onclick={() => goto(resolve('/board/user/kauf'))}
					variant="outline"
				>
					<AnimatedTokenCount {tokenCount} />
				</Button>
			{/if}
			<TemplatesDialog />
		</div>
		<Howto />
	</div>
</div>

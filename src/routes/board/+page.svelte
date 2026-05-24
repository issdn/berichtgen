<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Howto from '$core/components/Howto.svelte';
	import TemplatesDialog from '$templates/components/TemplatesDialog.svelte';
	import AnimatedTokenCount from '$tokens/components/AnimatedTokenCount.svelte';
	import { Button } from '$ui/button';
	import Wizard from '$wizard/components/Wizard.svelte';
	import WizardDropzone from '$wizard/components/WizardDropzone.svelte';

	let { data } = $props();

	let { tokenCount } = $derived(data);
</script>

<svelte:head>
	<title>Berichtgen</title>
</svelte:head>

<div
	class="flex w-full flex-col gap-4 px-4 pb-4 md:h-[calc(100%-5rem)] md:flex-row"
>
	<div
		class="flex w-full flex-col gap-4 md:grid md:h-full md:min-h-0 md:max-w-1/2 md:grid-rows-2 md:overflow-hidden"
	>
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

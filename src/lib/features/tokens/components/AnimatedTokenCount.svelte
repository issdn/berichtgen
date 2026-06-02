<script lang="ts">
	import { HandCoins } from '@lucide/svelte';
	import { IsMounted } from 'runed';
	import { cubicOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';

	interface Props {
		tokenCount: number;
	}

	let { tokenCount }: Props = $props();

	const isMounted = new IsMounted();

	function getDigits(num: number): number[] {
		return num.toString().split('').map(Number);
	}

	let displayValue = $derived(getDigits(tokenCount));
</script>

<span class="inline-flex items-center gap-x-1">
	<HandCoins class="size-4" />
	{#if isMounted}
		<span class="flex flex-row">
			{#each displayValue as digit, i (i)}
				<span class="relative inline-block w-[1ch] overflow-hidden">
					{#key i}
						<span
							class="inline-block w-full text-center"
							in:fly|global={{
								delay: i * 50,
								duration: 100,
								easing: cubicOut,
								y: 15
							}}
						>
							{digit}
						</span>
					{/key}
				</span>
			{/each}
		</span>
	{/if}
</span>

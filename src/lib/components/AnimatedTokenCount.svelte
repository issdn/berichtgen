<script lang="ts">
	import { HandCoins } from '@lucide/svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	interface Props {
		tokenCount: number;
	}

	let { tokenCount }: Props = $props();

	function getDigits(num: number): number[] {
		return num.toString().split('').map(Number);
	}

	// svelte-ignore state_referenced_locally
	let previousCount = tokenCount;
	let direction = $state(1);

	$effect(() => {
		direction = tokenCount >= previousCount ? 1 : -1;
		previousCount = tokenCount;
	});

	let displayValue = $derived(getDigits(tokenCount));
</script>

<span class="inline-flex items-center gap-x-1">
	<HandCoins class="size-4" />
	<span class="flex flex-row">
		{#each displayValue as digit, i (i)}
			<span class="relative inline-block w-[1ch] overflow-hidden">
				{#key digit}
					<span
						class="inline-block w-full text-center"
						in:fly={{
							y: 15 * direction,
							duration: 100,
							delay: i * 50,
							easing: cubicOut
						}}
						out:fly={{
							y: -15 * direction,
							duration: 100,
							delay: i * 50,
							easing: cubicOut
						}}
					>
						{digit}
					</span>
				{/key}
			</span>
		{/each}
	</span>
</span>

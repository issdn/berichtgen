<script lang="ts">
	import { Button } from '$ui/button';
	import { Check, Copy } from '@lucide/svelte';

	interface Props {
		children?: import('svelte').Snippet;
		text: string;
	}

	let { children, text }: Props = $props();

	let copied = $state(false);

	/** Copy text to clipboard and show checkmark briefly. */
	function handleClick() {
		navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 2000);
	}
</script>

<Button variant="ghost" onclick={handleClick}>
	{#if copied}
		<Check />
	{:else}
		<Copy />
	{/if}
	{@render children?.()}
</Button>

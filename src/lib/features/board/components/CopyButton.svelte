<script lang="ts">
	import { Button } from '$ui/button';
	import { Copy, Check } from '@lucide/svelte';

	interface Props {
		text: string;
		children?: import('svelte').Snippet;
	}

	let { text, children }: Props = $props();

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

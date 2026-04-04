<script lang="ts">
	import { dev } from '$app/environment';
	import { type Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

{#if dev}
	{@render children()}
{/if}

<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import type { UserContext } from '../types';

	const { loggedIn } = getContext<UserContext>('user')();

	let { children }: { children: Snippet } = $props();
</script>

{#if loggedIn}
	{@render children()}
{/if}

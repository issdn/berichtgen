<script lang="ts">
	import type { UserContext } from '$auth/types';
	import { type Snippet, getContext } from 'svelte';

	const { loggedIn } = getContext<UserContext>('user')();

	let { children }: { children: Snippet } = $props();
</script>

{#if loggedIn}
	{@render children()}
{/if}

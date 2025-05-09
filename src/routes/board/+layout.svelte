<script lang="ts">
	import { incuriaStore } from '$lib/stores/board.svelte.js';
	import { onMount, setContext } from 'svelte';

	let { data, children } = $props();

	const loggedIn = data.user !== null;

	setContext('user', { user: data.user, loggedIn });

	incuriaStore.providers = data.providers;

	onMount(() => {
		if (loggedIn) {
			const providerId = localStorage.getItem('provider') ?? data.providers[0].id;

			incuriaStore.currentProvider =
				data.providers.find((provider) => provider.id === providerId) ?? data.providers[0];
		}
	});
</script>

{@render children()}

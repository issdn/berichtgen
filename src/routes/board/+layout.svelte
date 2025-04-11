<script lang="ts">
	import { incuriaStore } from '$lib/stores/board.svelte.js';
	import { onMount } from 'svelte';

	let { data, children } = $props();

	incuriaStore.providers = data.providers;

	onMount(() => {
		const providerId = localStorage.getItem('provider') ?? data.providers[0].id;

		incuriaStore.currentProvider =
			data.providers.find((provider) => provider.id === providerId) ?? data.providers[0];
	});
</script>

{@render children()}

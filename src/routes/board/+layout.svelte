<script lang="ts">
	import { incuriaStore } from '$lib/stores/board.svelte.js';
	import { onMount } from 'svelte';

	let { data, children } = $props();

	incuriaStore.providers = data.providers;

	onMount(() => {
		incuriaStore.currentProvider = localStorage.getItem('provider') ?? data.providers[0].name;
	});
</script>

{@render children()}

<script lang="ts">
	import { incuriaStore } from '$lib/stores/board.svelte.js';

	let { data, children } = $props();

	incuriaStore.providers = data.providers;
	incuriaStore.currentProvider = data.providers[0];
</script>

{@render children()}

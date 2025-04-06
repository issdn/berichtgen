<script lang="ts">
	import { incuriaStore } from '$lib/stores/board.svelte.js';

	let { data, children } = $props();

	incuriaStore.providers = data.providers;
</script>

{@render children()}

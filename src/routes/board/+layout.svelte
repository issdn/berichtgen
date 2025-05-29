<script lang="ts">
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte.js';
	import { type UserContext } from '$src/lib/types.js';
	import { getContext, onMount } from 'svelte';

	let { data, children } = $props();

	let { loggedIn } = getContext<UserContext>('user')();

	berichtgenStore.providers = data.providers;

	onMount(() => {
		if (loggedIn) {
			const providerId = localStorage.getItem('provider') ?? data.providers[0].id;

			berichtgenStore.currentProvider =
				data.providers.find((provider) => provider.id === providerId) ?? data.providers[0];
		}
	});
</script>

{@render children()}

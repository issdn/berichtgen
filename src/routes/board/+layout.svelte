<script lang="ts">
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte.js';
	import { type UserContext } from '$src/lib/types.js';
	import { getContext, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	let { data, children } = $props();

	let getUser = getContext<UserContext>('user');

	let { loggedIn } = $derived(getUser());

	let providers = $derived(data.providers);

	$effect.pre(() => {
		berichtgenStore.providers = providers;
		berichtgenStore.processPhotos = JSON.parse(localStorage.getItem('processPhotos') ?? 'false');
		berichtgenStore.rewordJSON = loggedIn
			? JSON.parse(localStorage.getItem('rewordJSON') ?? 'false')
			: false;
		berichtgenStore.contantHours = JSON.parse(localStorage.getItem('contantHours') ?? 'false');
		if (loggedIn && providers.length > 0) {
			const providerId = localStorage.getItem('provider') ?? providers[0].id;
			berichtgenStore.currentProvider =
				providers.find((provider) => provider.id === providerId) ?? providers[0];
		}
	});
</script>

<div
	class="bg-secondary fixed top-8 -left-10 z-50 -rotate-45 transform px-8 py-2 text-sm font-medium"
>
	🚧 In Entwicklung
</div>

{@render children()}

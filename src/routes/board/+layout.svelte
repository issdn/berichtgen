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
		berichtgenStore.rewordJSON = JSON.parse(localStorage.getItem('rewordJSON') ?? 'false');
		berichtgenStore.contantHours = JSON.parse(localStorage.getItem('contantHours') ?? 'false');
		if (loggedIn && providers.length > 0) {
			const providerId = localStorage.getItem('provider') ?? providers[0].id;
			berichtgenStore.currentProvider =
				providers.find((provider) => provider.id === providerId) ?? providers[0];
		}
	});

	onMount(() => {
		toast.info(
			'Diese App is aktuell in der Entwicklung und kann Fehler enthalten. Anmeldung ist deaktiviert!',
			{ dismissable: false }
		);
	});
</script>

{@render children()}

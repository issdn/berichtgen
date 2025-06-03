<script lang="ts">
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte.js';
	import { type UserContext } from '$src/lib/types.js';
	import { getContext, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	let { data, children } = $props();

	let { loggedIn } = getContext<UserContext>('user')();

	berichtgenStore.providers = data.providers;

	onMount(() => {
		toast.info(
			'Diese App is aktuell in der Entwicklung und kann Fehler enthalten. Anmeldung ist deaktiviert!',
			{ dismissable: true, duration: 10000 }
		);
		berichtgenStore.processPhotos = JSON.parse(localStorage.getItem('processPhotos') ?? 'false');
		berichtgenStore.rewordJSON = JSON.parse(localStorage.getItem('rewordJSON') ?? 'false');
		if (loggedIn && data.providers.length > 0) {
			const providerId = localStorage.getItem('provider') ?? data.providers[0].id;
			berichtgenStore.currentProvider =
				data.providers.find((provider) => provider.id === providerId) ?? data.providers[0];
		}
	});
</script>

{@render children()}

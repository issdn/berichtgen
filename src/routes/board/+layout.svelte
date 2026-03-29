<script lang="ts">
	import type { UserContext } from '$auth/types';
	import { berichtgenStore } from '$lib/stores/berichtgen.svelte';
	import { getContext, setContext } from 'svelte';

	let { data, children } = $props();

	let { tokenCount, userMetadata } = $derived(data);

	function setTokenCount(count: number) {
		tokenCount = count;
	}

	setContext('board', () => ({ tokenCount, setTokenCount, userMetadata }));

	let getUser = getContext<UserContext>('user');

	let { loggedIn } = $derived(getUser());

	$effect.pre(() => {
		berichtgenStore.processPhotos = JSON.parse(
			localStorage.getItem('processPhotos') ?? 'false'
		);
		berichtgenStore.rewordJSON = loggedIn
			? JSON.parse(localStorage.getItem('rewordJSON') ?? 'false')
			: false;
		berichtgenStore.constantHours = JSON.parse(
			localStorage.getItem('constantHours') ?? 'false'
		);
		berichtgenStore.preferedTemplatePath = JSON.parse(
			localStorage.getItem('preferedTemplatePath') ?? 'null'
		);
	});
</script>

{@render children()}

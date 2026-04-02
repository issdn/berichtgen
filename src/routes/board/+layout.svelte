<script lang="ts">
	import type { UserContext } from '$auth/types';
	import { berichtgenStore } from '$lib/stores/berichtgen.svelte';
	import { getContext, setContext } from 'svelte';
	import { getFlash } from 'sveltekit-flash-message';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';

	let { data, children } = $props();

	const flash = getFlash(page);

	$effect(() => {
		if (!$flash) return;
		switch ($flash.type) {
			case 'success':
				toast.success($flash.message, $flash.data);
				break;
			case 'error':
				toast.error($flash.message, $flash.data);
				break;
			default:
				toast.info($flash.message, $flash.data);
		}
		flash.set(undefined);
	});

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

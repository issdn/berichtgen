<script lang="ts">
	import { berichtgenStore } from '$lib/stores/berichtgen.svelte';
	import { getFlash } from 'sveltekit-flash-message';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';

	let { children } = $props();

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

	$effect.pre(() => {
		berichtgenStore.processPhotos = JSON.parse(
			localStorage.getItem('processPhotos') ?? 'false'
		);
		berichtgenStore.rewordJSON = page.data.loggedIn
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

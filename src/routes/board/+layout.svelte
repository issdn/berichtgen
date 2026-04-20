<script lang="ts">
	import berichtgenStore from '$lib/stores/berichtgen.svelte';
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
		if (!page.data.loggedIn) {
			berichtgenStore.set('rewordJSON', false);
		}
	});
</script>

{@render children()}



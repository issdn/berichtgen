<script lang="ts">
	import { page } from '$app/state';
	import PersistenceIndicator from '$core/persistence/PersistenceIndicator.svelte';
	import { WizardPersistenceController } from '$core/persistence/wizard_persistence_controller.svelte';
	import berichtgenStore from '$core/stores/berichtgen.svelte';
	import {
		WizardMediator,
		wizardMediatorContext
	} from '$wizard/services/wizard_mediator.svelte';
	import { toast } from 'svelte-sonner';
	import { getFlash } from 'sveltekit-flash-message';

	let { children } = $props();

	const persistence = new WizardPersistenceController();

	wizardMediatorContext.set(
		WizardMediator.createDefault({ persistence, userId: page.data.user?.id })
	);

	const flash = getFlash(page);

	$effect(() => {
		if (!$flash) return;
		switch ($flash.type) {
			case 'error':
				toast.error($flash.message, $flash.data);
				break;
			case 'success':
				toast.success($flash.message, $flash.data);
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
<PersistenceIndicator controller={persistence} />

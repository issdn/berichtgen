<script lang="ts">
	import type { WizardPersistenceController } from '$core/persistence/wizard_persistence_controller.svelte';

	import Button from '$lib/components/ui/button/button.svelte';
	import { Spinner } from '$ui/spinner';
	import ErrorModal from '$wizard/components/ErrorModal.svelte';
	import { CircleCheck, CircleX } from '@lucide/svelte';
	import { fly } from 'svelte/transition';

	let {
		controller
	}: {
		controller: WizardPersistenceController;
	} = $props();

	let errorModalOpen = $state(false);
	let hasError = $derived((controller.mutation?.error ?? null) !== null);
</script>

{#if controller.mutation !== null}
	<div
		transition:fly={{ y: 20 }}
		data-testid="persistence-indicator"
		class="bg-background border-muted fixed bottom-2 left-2 z-50 flex items-center gap-2 rounded-md border px-3 py-2 text-sm shadow"
	>
		{#if hasError}
			<CircleX class="text-destructive size-4" />
			<span class="text-destructive">Speichern fehlgeschlagen</span>
			<Button variant="ghost" onclick={() => (errorModalOpen = true)}>
				Details
			</Button>
			<ErrorModal
				bind:open={errorModalOpen}
				error={controller.mutation.error}
			/>
		{:else if controller.status === 'saved'}
			<CircleCheck class="size-4 text-green-600" />
			<span>Gespeichert</span>
		{:else if controller.mutation.loading}
			<Spinner size="sm" />
			<span>Speichere…</span>
		{/if}
	</div>
{/if}

<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Spinner from '$src/lib/components/ui/Spinner.svelte';
	import { wizardScheduler } from '$src/lib/wizard_scheduler.svelte';
	import type { Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';

	let {
		fn,
		download,
		children
	}: {
		fn: () => Promise<void>;
		download: string;
		children: Snippet;
	} = $props();

	let isLoading = $state(false);
</script>

<Button
	disabled={wizardScheduler.isRunning || !wizardScheduler.result}
	onclick={() => {
		isLoading = true;
		fn()
			.catch(() => toast.error('Etwas ist falsch gelaufen 🥲'))
			.finally(() => {
				isLoading = false;
			});
	}}
	{download}
>
	{#if isLoading}
		<Spinner size="sm" />
	{:else}
		{@render children()}
	{/if}
</Button>

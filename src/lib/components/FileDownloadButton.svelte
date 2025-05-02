<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Spinner from '$src/lib/components/ui/Spinner.svelte';
	import type { ResultEntry } from '$src/lib/types';
	import { wizardScheduler } from '$src/lib/wizard_scheduler.svelte';
	import type { Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';

	let {
		fn,
		download,
		children
	}: {
		fn: (result: Promise<ResultEntry[]>) => Promise<void>;
		download: string;
		children: Snippet;
	} = $props();

	let isLoading = $state(false);
</script>

<Button
	disabled={wizardScheduler.isRunning || !wizardScheduler.result}
	onclick={() => {
		isLoading = true;
		fn(wizardScheduler.result!)
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

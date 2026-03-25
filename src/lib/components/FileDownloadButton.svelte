<script lang="ts">
	import Button, {
		type ButtonProps
	} from '$lib/components/ui/button/button.svelte';
	import Spinner from '$src/lib/components/ui/Spinner.svelte';
	import { wizardScheduler } from '$src/lib/wizard_scheduler.svelte';
	import type { Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';

	let {
		fn,
		download,
		children,
		...restProps
	}: {
		fn: () => Promise<void>;
		download: string;
		children: Snippet;
	} & ButtonProps = $props();

	let isLoading = $state(false);
</script>

<Button
	{...restProps}
	disabled={isLoading || wizardScheduler.isRunning || !wizardScheduler.result}
	onclick={() => {
		console.log('Downloading file...');
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

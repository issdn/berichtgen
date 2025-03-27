<script lang="ts">
	import SettingsPopover from './SettingsPopover.svelte';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';
	import Button from '$lib/components/ui/button/button.svelte';
	import { goto } from '$app/navigation';
	let { children, data } = $props();

	const { session } = data;
</script>

<div class="h-nav flex flex-row items-center justify-between px-8 md:px-8">
	<Button
		onclick={() => goto('/board')}
		variant="link"
		class="font-cormorant text-3xl dark:text-primary-foreground">Incuria</Button
	>
	<SettingsPopover {session}></SettingsPopover>
</div>

<Toaster />
<ModeWatcher />
{@render children()}

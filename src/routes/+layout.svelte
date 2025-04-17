<script lang="ts">
	import SettingsPopover from './SettingsPopover.svelte';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';
	import Button from '$lib/components/ui/button/button.svelte';
	import { goto } from '$app/navigation';
	import DarkMode from './board/DarkMode.svelte';

	let { children, data } = $props();

	const { session } = data;
</script>

<div class="h-nav flex w-full flex-row items-center justify-between px-4 md:px-8">
	<Button onclick={() => goto('/board')} variant="link" class="font-cormorant text-3xl"
		>Incuria</Button
	>
	<div class="flex flex-row gap-x-4">
		<SettingsPopover {session}></SettingsPopover>
		<DarkMode />
	</div>
</div>

<Toaster />
<ModeWatcher />
{@render children()}

<script lang="ts">
	import SettingsPopover from './SettingsPopover.svelte';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';
	let { children, data } = $props();

	const { session } = data;
</script>

<div class="h-nav flex flex-row items-center justify-end px-4 md:px-8">
	<SettingsPopover {session}></SettingsPopover>
</div>

<Toaster />
<ModeWatcher />
{@render children()}

<script lang="ts">
	import SettingsPopover from './SettingsPopover.svelte';

	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';
	let { children, data } = $props();

	const { session } = data;
</script>

<div class="h-nav flex flex-row items-center justify-end px-4 md:px-8">
	<SettingsPopover {session}></SettingsPopover>
</div>

<ModeWatcher />
{@render children()}

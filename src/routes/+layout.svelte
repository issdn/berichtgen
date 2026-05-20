<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';
	import Button from '$lib/components/ui/button/button.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { navigating } from '$app/state';
	import DarkMode from '../lib/components/ui/DarkMode.svelte';
	import { onMount } from 'svelte';
	import Logo from '$ui/svg/Logo.svelte';
	import { resolve } from '$app/paths';
	import SettingsPopover from '$core/auth/components/SettingsPopover.svelte';
	import ProgressBar from '$ui/ProgressBar.svelte';

	let { data, children } = $props();

	onMount(() => {
		const { data: authData } = data.supabase.auth.onAuthStateChange(
			(_, newSession) => {
				if (newSession?.expires_at !== data.session?.expires_at) {
					invalidate('supabase:auth');
				}
			}
		);
		return () => authData.subscription.unsubscribe();
	});
</script>

{#await navigating.complete}
	<ProgressBar visible class="fixed top-0 left-0 z-50" />
{/await}

<div
	class="h-nav flex w-full flex-row items-center justify-between px-4 md:px-8"
>
	<Button
		onclick={() => goto(resolve('/board'))}
		variant="link"
		class="[&_svg]:fill-primary cursor-pointer [&_svg]:h-9! [&_svg]:w-34!"
		><Logo /></Button
	>
	<div class="flex flex-row gap-x-4">
		<SettingsPopover />
		<DarkMode />
	</div>
</div>

<Toaster />
<ModeWatcher />
{@render children()}

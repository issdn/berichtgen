<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';

	import '../app.css';
	import { navigating } from '$app/state';
	import SettingsPopover from '$core/auth/components/SettingsPopover.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import ProgressBar from '$ui/ProgressBar.svelte';
	import Logo from '$ui/svg/Logo.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { onMount } from 'svelte';

	import DarkMode from '../lib/components/ui/DarkMode.svelte';

	let { children, data } = $props();

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

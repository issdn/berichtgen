<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';
	import Button from '$lib/components/ui/button/button.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { navigating } from '$app/state';
	import DarkMode from '../lib/components/ui/DarkMode.svelte';
	import { onMount, setContext } from 'svelte';
	import Logo from '$ui/svg/Logo.svelte';
	import { resolve } from '$app/paths';
	import SettingsPopover from '$auth/components/SettingsPopover.svelte';
	import ProgressBar from '$ui/ProgressBar.svelte';

	let { data, children } = $props();

	let { user, supabase, loggedIn, session, profile } = $derived({
		supabase: data.supabase,
		user: data.user,
		loggedIn: data.user !== null,
		session: data.session,
		profile: data.profile
	});

	setContext('user', () => ({
		user,
		loggedIn,
		supabase: supabase,
		profile: profile
	}));

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange((_, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});
		return () => data.subscription.unsubscribe();
	});
</script>

<ProgressBar visible={!!navigating.to} class="fixed top-0 left-0 z-50" />

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

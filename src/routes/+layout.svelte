<script lang="ts">
	import SettingsPopover from './SettingsPopover.svelte';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';
	import Button from '$lib/components/ui/button/button.svelte';
	import { goto, invalidate } from '$app/navigation';
	import DarkMode from './board/DarkMode.svelte';
	import { onMount, setContext } from 'svelte';
	import Logo from '$lib/svg/Logo.svelte';

	let { data, children } = $props();
	let { user, supabase, loggedIn, session } = $derived({
		supabase: data.supabase,
		user: data.user,
		loggedIn: data.user !== null,
		session: data.session
	});

	setContext('user', () => ({ user, loggedIn, supabase: supabase }));

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange((_, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});
		return () => data.subscription.unsubscribe();
	});
</script>

<div class="h-nav flex w-full flex-row items-center justify-between px-4 md:px-8">
	<Button
		onclick={() => goto('/board')}
		variant="link"
		class="font-cormorant text-3xl [&_svg]:h-[36px] [&_svg]:w-[136px] [&_svg]:fill-primary"
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

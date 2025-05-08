<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import '../app.css';
	import * as Popover from '$lib/components/ui/popover';
	import * as Avatar from '$lib/components/ui/avatar';
	import Google from '$lib/svg/Google.svelte';
	import { enhance } from '$app/forms';
	import { Label } from '$lib/components/ui/label';
	import { CircleHelp, HandCoins, LogOut, Settings } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import type { User } from '@supabase/supabase-js';

	let { user }: { user: User | null } = $props();

	let isLoggedIn = $derived(user !== null);
</script>

<Popover.Root>
	<Popover.Trigger>
		<div class="flex flex-row items-center gap-x-4">
			{#if user?.user_metadata.name !== null}
				<Label class="cursor-pointer">{user?.user_metadata.name}</Label>
			{/if}
			<Avatar.Root>
				<Avatar.Image src={user?.user_metadata.image} alt="Avatar" />
				<Avatar.Fallback
					>{(user?.user_metadata.name as string)
						?.split(' ')
						.map((s) => s[0])
						.join('') ?? 'IC'}</Avatar.Fallback
				>
			</Avatar.Root>
		</div>
	</Popover.Trigger>
	<Popover.Content class="flex w-56 flex-col gap-y-2">
		{#if isLoggedIn}
			<Button variant="outline" onclick={() => goto('/board/kauf')}
				><HandCoins />Tokens kaufen</Button
			>
			<div class="mb-1 flex flex-row items-center gap-x-4 border-b border-dashed pb-3">
				<Button onclick={() => goto('/board/settings')} variant="outline" class="w-full">
					<Settings />
					Einstellungen
				</Button>
			</div>
		{/if}
		{#if isLoggedIn}
			<form method="POST" action={`/auth?/signout`}>
				<input type="hidden" name="redirectTo" value="/" />
				<Button type="submit" class="w-full"><LogOut />Abmelden</Button>
			</form>
		{:else}
			<form method="POST" action={`/auth?/signin`} use:enhance>
				<input type="hidden" name="providerId" value="google" />
				<input type="hidden" name="redirectTo" value="/board" />
				<Button type="submit" class="w-full"><Google />Anmelden mit Google</Button>
			</form>
		{/if}
		<Button variant="outline" href="/impressum"><CircleHelp />Impressum</Button>
		<div class="flex flex-row items-center justify-center gap-x-1 text-muted-foreground">
			<p>v1.0.0</p>
		</div>
	</Popover.Content>
</Popover.Root>

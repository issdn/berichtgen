<script lang="ts">
	import { ModeWatcher } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button';
	import '../app.css';
	import * as Popover from '$lib/components/ui/popover';
	import * as Avatar from '$lib/components/ui/avatar';
	import Google from '$lib/svg/Google.svelte';
	import { enhance } from '$app/forms';
	import { Label } from '$lib/components/ui/label';
	let { children, data } = $props();

	const { session } = data;
</script>

<div class="h-nav flex flex-row items-center justify-end px-4 md:px-8">
	<Popover.Root>
		<Popover.Trigger>
			<div class="flex flex-row items-center gap-x-4">
				{#if session?.user?.name !== null}
					<Label>{session?.user?.name}</Label>
				{/if}
				<Avatar.Root>
					<Avatar.Image src={session?.user?.image} alt="Avatar" />
					<Avatar.Fallback
						>{session?.user?.name
							?.split(' ')
							.map((s) => s[0])
							.join('') ?? 'IC'}</Avatar.Fallback
					>
				</Avatar.Root>
			</div>
		</Popover.Trigger>
		<Popover.Content class="flex w-56 flex-col gap-y-2">
			<form method="POST" action={`/signin`} use:enhance>
				<input type="hidden" name="providerId" value="google" />
				<input type="hidden" name="redirectTo" value="/board" />
				<Button type="submit" class="w-full"><Google />Anmelden mit Google</Button>
			</form>
			<form method="POST" action={`/signout`} use:enhance>
				<input type="hidden" name="redirectTo" value="/" />
				<Button type="submit" class="w-full" variant="secondary">Abmelden</Button>
			</form>
		</Popover.Content>
	</Popover.Root>
</div>

<ModeWatcher />
{@render children()}

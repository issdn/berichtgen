<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import '../app.css';
	import * as Popover from '$lib/components/ui/popover';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Label } from '$lib/components/ui/label';
	import { CircleHelp, HandCoins, KeyRound, LogOut, Mail, Settings } from 'lucide-svelte';
	import { goto, invalidate } from '$app/navigation';
	import { getContext } from 'svelte';
	import { type UserContext } from '$src/lib/types';
	import { enhance } from '$app/forms';
	import Google from '$src/lib/svg/Google.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as InputOTP from '$lib/components/ui/input-otp/index.js';
	import { Input } from '$src/lib/components/ui/input';
	import { incuriaStore } from '$src/lib/stores/board.svelte';
	import { toast } from 'svelte-sonner';
	import { defaults, superForm } from 'sveltekit-superforms/client';
	import * as z from 'zod';
	import { zod } from 'sveltekit-superforms/adapters';
	import * as Form from '$lib/components/ui/form/index.js';
	import { page } from '$app/state';

	let { user, loggedIn, supabase } = $derived(getContext<UserContext>('user')());

	let otpDialogOpen = $state(false);

	let token = $state('');

	let loading = $state(false);

	$effect(() => {
		if (token.length >= 6) {
			if (incuriaStore.tempEmailContainer) {
				loading = true;
				supabase.auth
					.verifyOtp({ type: 'email', token, email: incuriaStore.tempEmailContainer })
					.then(({ data, error }) => {
						token = '';
						loading = false;
						if (error) {
							toast.error(error.message);
						} else {
							toast.success('OTP erfolgreich verifiziert');
							incuriaStore.tempEmailContainer = '';
							otpDialogOpen = false;
							goto('/board', {
								replaceState: true,
								invalidateAll: true
							});
						}
					});
			}
		}
	});

	const emailSchema = z.object({
		mail: z.string().email('Bitte eine gültige Email-Adresse eingeben')
	});

	const form = superForm(defaults({ mail: incuriaStore.tempEmailContainer }, zod(emailSchema)), {
		SPA: true,
		validators: zod(emailSchema),
		async onUpdate({ form }) {
			if (form.valid) {
				loading = true;
				const { data, error } = await supabase.auth.signInWithOtp({
					email: form.data.mail!,
					options: {
						emailRedirectTo: page.url.origin + '/board'
					}
				});
				loading = false;
				if (error) {
					toast.error(error.message);
				} else {
					incuriaStore.tempEmailContainer = form.data.mail!;
					toast.success('Magic-Link gesendet');
				}
			}
		}
	});

	const { form: formData, enhance: mailInputEnhance } = form;
</script>

<Popover.Root>
	<Popover.Trigger>
		<div class="flex flex-row items-center gap-x-4">
			{#if user?.user_metadata.name !== null && loggedIn}
				<Label class="cursor-pointer">{user?.user_metadata.name ?? 'Benutzer'}</Label>
			{/if}
			<Avatar.Root>
				<Avatar.Image src={user?.user_metadata.image} alt="Avatar" />
				<Avatar.Fallback
					>{!loggedIn
						? 'AN'
						: ((user?.user_metadata.name as string)
								?.split(' ')
								.map((s) => s[0])
								.join('') ?? 'GEN')}</Avatar.Fallback
				>
			</Avatar.Root>
		</div>
	</Popover.Trigger>
	<Popover.Content class="flex w-56 flex-col gap-y-2">
		{#if loggedIn}
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
		{#if loggedIn}
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
			<Button onclick={() => (otpDialogOpen = true)}><KeyRound />OTP Anmeldung</Button>
		{/if}
		<Button variant="outline" href="/impressum"><CircleHelp />Impressum</Button>
		<div class="flex flex-row items-center justify-center gap-x-1 text-muted-foreground">
			<p>v1.0.0</p>
		</div>
	</Popover.Content>
</Popover.Root>

<Dialog.Root open={otpDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>OTP Anmeldung</Dialog.Title>
			<div class="py-4">
				<form method="POST" use:mailInputEnhance>
					<Form.Field {form} name="mail">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Magic-Link an deine Email senden</Form.Label>
								<div class="flex flex-row gap-x-2">
									<Input {...props} bind:value={$formData.mail} />
									<Button disabled={loading} type="submit">
										<Mail />
									</Button>
								</div>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</form>
				<p class="mb-4 mt-8 w-full text-center">
					folge den Link aus deiner Email oder gebe den OTP-Code ein
				</p>
				<div class="flex flex-row justify-center">
					<InputOTP.Root disabled={loading} bind:value={token} maxlength={6}>
						{#snippet children({ cells })}
							<InputOTP.Group>
								{#each cells.slice(0, 3) as cell (cell)}
									<InputOTP.Slot {cell} />
								{/each}
							</InputOTP.Group>
							<InputOTP.Separator />
							<InputOTP.Group>
								{#each cells.slice(3, 6) as cell (cell)}
									<InputOTP.Slot {cell} />
								{/each}
							</InputOTP.Group>
						{/snippet}
					</InputOTP.Root>
				</div>
			</div>
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>

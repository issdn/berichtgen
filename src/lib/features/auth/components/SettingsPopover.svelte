<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { emailSchema } from '$auth/schemas';
	import berichtgenStore from '$lib/stores/berichtgen.svelte';
	import { getUserDisplayName } from '$lib/utils';
	import { toast } from 'svelte-sonner';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import * as Popover from '$ui/popover';
	import * as Avatar from '$ui/avatar';
	import * as Form from '$ui/form';
	import * as InputOTP from '$ui/input-otp';
	import * as Dialog from '$ui/dialog';
	import { Button } from '$ui/button';
	import {
		CircleHelp,
		HandCoins,
		KeyRound,
		Lock,
		LogOut,
		Mail,
		Settings
	} from '@lucide/svelte';
	import { Label } from '$ui/label';
	import DebugLoginDialog from './DebugLoginDialog.svelte';
	import Google from '$ui/svg/Google.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Input } from '$ui/input';
	import Debug from './Debug.svelte';

	let otpDialogOpen = $state(false);

	let token = $state('');

	let loading = $state(false);

	let { fullName, shortName } = $derived(
		getUserDisplayName(page.data.userProfile, page.data.user)
	);

	$effect(() => {
		if (token.length >= 6) {
			const tempEmailContainer = berichtgenStore.get('tempEmailContainer');
			if (tempEmailContainer) {
				loading = true;
				page.data.supabase.auth
					.verifyOtp({
						type: 'email',
						token,
						email: tempEmailContainer
					})
					.then((result: { error: { message: string } | null }) => {
						const { error } = result;
						token = '';
						loading = false;
						if (error) {
							toast.error(error.message);
						} else {
							toast.success('OTP erfolgreich verifiziert');
							berichtgenStore.set('tempEmailContainer', '');
							otpDialogOpen = false;
							goto(resolve('/board'), {
								replaceState: true,
								invalidateAll: true
							});
						}
					});
			}
		}
	});

	const form = superForm(
		defaults(
			{ mail: berichtgenStore.get('tempEmailContainer') },
			zod4(emailSchema)
		),
		{
			SPA: true,
			validators: zod4(emailSchema),
			async onUpdate({ form }) {
				if (form.valid) {
					loading = true;
					const { error } = await page.data.supabase.auth.signInWithOtp({
						email: form.data.mail!,
						options: {
							emailRedirectTo: page.url.origin + '/board'
						}
					});
					loading = false;
					if (error) {
						toast.error(error.message);
					} else {
						berichtgenStore.set('tempEmailContainer', form.data.mail!);
						toast.success('Magic-Link gesendet');
					}
				}
			}
		}
	);

	const { form: formData, enhance: mailInputEnhance } = form;
</script>

<Popover.Root>
	<Popover.Trigger>
		<div class="flex flex-row items-center gap-x-4">
			<Label class="cursor-pointer">{fullName}</Label>

			<Avatar.Root>
				<Avatar.Image src={page.data.user?.user_metadata.image} alt="Avatar" />
				<Avatar.Fallback>{shortName}</Avatar.Fallback>
			</Avatar.Root>
		</div>
	</Popover.Trigger>
	<Popover.Content class="flex w-56 flex-col gap-y-2">
		{#if page.data.loggedIn}
			<Button
				variant="outline"
				onclick={() => goto(resolve('/board/user/kauf'))}
				><HandCoins />Tokens kaufen</Button
			>
			<div
				class="mb-1 flex flex-row items-center gap-x-4 border-b border-dashed pb-3"
			>
				<Button
					onclick={() => goto(resolve('/board/user/settings'))}
					variant="outline"
					class="w-full"
				>
					<Settings />
					Einstellungen
				</Button>
			</div>
		{/if}
		{#if page.data.loggedIn}
			<form method="POST" action="/auth?/signout">
				<input type="hidden" name="redirectTo" value="/" />
				<Button type="submit" class="w-full"><LogOut />Abmelden</Button>
			</form>
		{:else}
			<Label class="text-xs">Anmeldung derzeit deaktiviert</Label>
			<form method="POST" action="/auth?/signin" use:enhance>
				<input type="hidden" name="providerId" value="google" />
				<input type="hidden" name="redirectTo" value="/board" />
				<Button type="submit" class="w-full"
					><Google />Anmelden mit Google</Button
				>
			</form>
			<Button disabled={true} onclick={() => (otpDialogOpen = true)}
				><KeyRound />OTP Anmeldung</Button
			>
			<Debug>
				<DebugLoginDialog />
			</Debug>
		{/if}
		<Button variant="outline" href="/impressum"><CircleHelp />Impressum</Button>
		<Button variant="outline" href="/datenschutz"
			><Lock />Datenschutzerklärung</Button
		>
		<div
			class="text-muted-foreground flex flex-row items-center justify-center gap-x-1"
		>
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
									<Input
										type="email"
										autocomplete="on"
										{...props}
										bind:value={$formData.mail}
									/>
									<Button disabled={loading} type="submit">
										<Mail />
									</Button>
								</div>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</form>
				<p class="mt-8 mb-4 w-full text-center">
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



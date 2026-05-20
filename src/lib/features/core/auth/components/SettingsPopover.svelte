<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { emailSchema } from '$core/auth/schemas';
	import berichtgenStore from '$core/stores/berichtgen.svelte';
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
	import Checkbox from '$ui/checkbox/checkbox.svelte';
	import {
		CircleHelp,
		MessageSquare,
		HandCoins,
		KeyRound,
		Lock,
		LogOut,
		Mail,
		Milestone,
		Settings
	} from '@lucide/svelte';
	import { Label } from '$ui/label';
	import DebugLoginDialog from './DebugLoginDialog.svelte';
	import Google from '$ui/svg/Google.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Input } from '$ui/input';
	import Debug from './Debug.svelte';
	import { Separator } from '$ui/separator';
	import GlobalPasteHandler from '$lib/components/GlobalPasteHandler.svelte';
	import { AsyncResource } from '$core/async.svelte';
	import { submitUserFeedback } from '$core/auth/api/feedback.remote';
	import {
		BerichtgenError,
		ECommonServerError,
		toErrorBody
	} from '$lib/errors';
	import { tryResultAsync } from '$lib/result';
	import { Textarea } from '$ui/textarea';

	let otpDialogOpen = $state(false);
	let feedbackDialogOpen = $state(false);
	let token = $state('');
	let feedbackMessage = $state('');
	let feedbackPending = $state(false);
	let otpCooldownSeconds = $state(0);
	let otpCooldownTimer: ReturnType<typeof setInterval> | null = null;

	let privacyAccepted = $state(false);

	let { fullName, shortName } = $derived(
		getUserDisplayName(page.data.profile, page.data.user)
	);

	const verifyOtpResource = new AsyncResource(
		async (params: { token: string; email: string }) => {
			const { error } = await page.data.supabase.auth.verifyOtp({
				type: 'email',
				token: params.token,
				email: params.email
			});
			if (error) throw error;
		},
		{
			onSuccess: () => {
				token = '';
				toast.success('OTP erfolgreich verifiziert');
				berichtgenStore.set('tempEmailContainer', '');
				otpDialogOpen = false;
				goto(resolve('/board'), {
					replaceState: true,
					invalidateAll: true
				});
			},
			onError: (e) => {
				token = '';
				toast.error(e.message);
			}
		}
	);

	$effect(() => {
		if (token.length < 6) return;
		if (verifyOtpResource.loading) return;
		const email = $formData.mail ?? berichtgenStore.get('tempEmailContainer');
		if (!email) return;
		void verifyOtpResource.execute({ token, email });
	});

	function startOtpCooldown() {
		otpCooldownSeconds = 60;
		if (otpCooldownTimer) clearInterval(otpCooldownTimer);
		otpCooldownTimer = setInterval(() => {
			otpCooldownSeconds = Math.max(0, otpCooldownSeconds - 1);
			if (otpCooldownSeconds === 0 && otpCooldownTimer) {
				clearInterval(otpCooldownTimer);
				otpCooldownTimer = null;
			}
		}, 1000);
	}

	function handleOtpPaste(e: ClipboardEvent) {
		if (!otpDialogOpen || verifyOtpResource.loading || $submitting) return;

		const pastedText = e.clipboardData?.getData('text/plain') ?? '';
		const otp = pastedText.replace(/\D/g, '').slice(0, 6);
		if (!otp) return;

		e.preventDefault();
		token = otp;
	}

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
					if (otpCooldownSeconds > 0) {
						toast.info(
							`Bitte warte ${otpCooldownSeconds}s bevor du erneut einen OTP-Code anforderst.`
						);
						return;
					}
					const { error } = await page.data.supabase.auth.signInWithOtp({
						email: form.data.mail!,
						options: {
							emailRedirectTo: page.url.origin + '/board'
						}
					});
					if (error) {
						toast.error(error.message);
					} else {
						berichtgenStore.set('tempEmailContainer', form.data.mail!);
						toast.success('Magic-Link gesendet');
						startOtpCooldown();
					}
				}
			}
		}
	);

	const { form: formData, enhance: mailInputEnhance, submitting } = form;

	async function submitFeedback() {
		feedbackPending = true;
		const result = await tryResultAsync(
			submitUserFeedback({ message: feedbackMessage }),
			BerichtgenError,
			ECommonServerError.INTERNAL_ERROR
		);
		if (result.ok) {
			feedbackMessage = '';
			feedbackDialogOpen = false;
			toast.success('Feedback gesendet.');
		} else {
			toast.error('Feedback konnte nicht gesendet werden.', {
				description: toErrorBody(result.error).message
			});
		}
		feedbackPending = false;
	}
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
			<div class="flex flex-row items-center gap-x-4">
				<Button
					onclick={() => goto(resolve('/board/user/settings'))}
					variant="outline"
					class="w-full"
				>
					<Settings />
					Einstellungen
				</Button>
			</div>
			<Button variant="outline" onclick={() => (feedbackDialogOpen = true)}>
				<MessageSquare />
				Feedback
			</Button>
		{/if}
		{#if page.data.loggedIn}
			<Separator />
			<form method="POST" action="/auth?/signout">
				<input type="hidden" name="redirectTo" value="/" />
				<Button type="submit" class="w-full"><LogOut />Abmelden</Button>
			</form>
		{:else}
			<div class="flex items-center gap-x-2">
				<Checkbox
					id="privacy-checkbox"
					bind:checked={privacyAccepted}
					class="shrink-0"
				/>
				<Label
					for="privacy-checkbox"
					class="block flex-1 text-left text-sm leading-snug"
				>
					Ich akzeptiere die
					<a
						class="block text-left underline"
						href={resolve('/datenschutz')}
						target="_blank"
						rel="noopener noreferrer">Datenschutzerklärung</a
					>
				</Label>
			</div>
			<form method="POST" action="/auth?/signin" use:enhance>
				<input type="hidden" name="providerId" value="google" />
				<input type="hidden" name="redirectTo" value="/board" />
				<Button type="submit" class="w-full" disabled={!privacyAccepted}
					><Google />Anmelden mit Google</Button
				>
			</form>
			<Button onclick={() => (otpDialogOpen = true)} disabled={!privacyAccepted}
				><KeyRound />OTP Anmeldung</Button
			>
			<Debug>
				<DebugLoginDialog />
			</Debug>
		{/if}
		<Separator />
		<Button variant="outline" href="/impressum"><CircleHelp />Impressum</Button>
		<Button variant="outline" href="/datenschutz"
			><Lock />Datenschutzerklärung</Button
		>
		<div
			class="text-muted-foreground flex flex-row items-center justify-center gap-x-1"
		>
			<Milestone size={16} />
			<span>{__APP_VERSION__}</span>
		</div>
	</Popover.Content>
</Popover.Root>

<Dialog.Root bind:open={otpDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>OTP Anmeldung</Dialog.Title>
			<GlobalPasteHandler handlePaste={handleOtpPaste} enabled={otpDialogOpen}>
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
										<Button
											disabled={$submitting ||
												verifyOtpResource.loading ||
												otpCooldownSeconds > 0}
											type="submit"
										>
											<Mail />
										</Button>
									</div>
									{#if otpCooldownSeconds > 0}
										<p class="text-muted-foreground mt-2 text-xs">
											Neuer OTP-Code in {otpCooldownSeconds}s verfugbar.
										</p>
									{/if}
								{/snippet}
							</Form.Control>
							<Form.FieldErrors />
						</Form.Field>
					</form>
					<p class="mt-8 mb-4 w-full text-center">
						folge den Link aus deiner Email oder gebe den OTP-Code ein
					</p>
					<div class="flex flex-row justify-center">
						<InputOTP.Root
							disabled={$submitting || verifyOtpResource.loading}
							bind:value={token}
							maxlength={6}
						>
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
			</GlobalPasteHandler>
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={feedbackDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Feedback senden</Dialog.Title>
			<Dialog.Description>Teile dein Feedback mit uns.</Dialog.Description>
		</Dialog.Header>
		<div class="flex flex-col gap-3 py-2">
			<Textarea
				bind:value={feedbackMessage}
				placeholder="Dein Feedback..."
				maxlength={1000}
				minlength={1}
				disabled={feedbackPending}
			/>
			<Dialog.Footer>
				<Button
					variant="outline"
					disabled={feedbackPending}
					onclick={() => {
						feedbackDialogOpen = false;
						feedbackMessage = '';
					}}>Abbrechen</Button
				>
				<Button
					disabled={feedbackPending || feedbackMessage.trim().length === 0}
					onclick={submitFeedback}
				>
					{#if feedbackPending}
						Wird gesendet...
					{:else}
						Senden
					{/if}
				</Button>
			</Dialog.Footer>
		</div>
	</Dialog.Content>
</Dialog.Root>

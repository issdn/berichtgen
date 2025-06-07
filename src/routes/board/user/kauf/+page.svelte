<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js';
	import { Elements, Address, PaymentElement } from 'svelte-stripe';
	import { PUBLIC_STRIPE_KEY } from '$env/static/public';
	import { Button } from '$lib/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';
	import { Badge } from '$src/lib/components/ui/badge';
	import { Input } from '$src/lib/components/ui/input';
	import { debounce } from '$src/lib/debounce';
	import * as Sentry from '@sentry/browser';
	import Spinner from '$src/lib/components/ui/Spinner.svelte';
	import * as Alert from '$src/lib/components/ui/alert';
	import { CircleAlert } from 'lucide-svelte';
	import { Label } from '$src/lib/components/ui/label';
	import * as Card from '$lib/components/ui/card/index.js';
	import Separator from '$src/lib/components/ui/separator/separator.svelte';
	import { IncuriaErrorType, PaymentStatus } from '$src/lib/types';
	import Checkbox from '$src/lib/components/ui/checkbox/checkbox.svelte';
	import { IncuriaError } from '$src/lib/errors.js';

	const { data } = $props();

	const { supabase, user } = data;

	const quantityBadges = [1, 2, 3, 5, 10];

	let stripe: Stripe | null = $state(null);
	let clientSecret: string | null = $state(null);
	let elements: StripeElements | null = $state(null);
	let processing: boolean = $state(false);
	let quantity: number = $state(1);
	let loadingIntent: boolean = $state(false);
	let error: string | null = $state(null);
	let termsAccepted: boolean = $state(false);

	onMount(async () => {
		stripe = await loadStripe(PUBLIC_STRIPE_KEY, { locale: 'de' });

		const { data } = await supabase.from('cart').select('quantity').eq('userId', user!.id).single();

		// create payment intent server side
		if (data?.quantity) {
			quantity = data.quantity;
			await createPaymentIntent();
		} else {
			await createPaymentIntent(quantity);
		}
	});

	async function createPaymentIntent(quantity: number = 1) {
		loadingIntent = true;
		try {
			const response = await fetch(`/board/user/kauf/create-payment-intent?quantity=${quantity}`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				}
			});
			const body = await response.json();
			if (!response.ok) {
				throw new IncuriaError(IncuriaErrorType.STRIPE_ERROR, body.message);
			}
			loadingIntent = false;
			clientSecret = body.clientSecret;
		} catch (e) {
			Sentry.captureException(e);
			const message = e instanceof Error ? e.message : 'Ursache unbekannt';
			toast.error('Stripe-Fehler: ' + message);
			error = message;
			loadingIntent = false;
			return null;
		}
	}

	async function submit() {
		// avoid processing duplicates
		if (processing || elements === null) return;

		processing = true;

		// confirm payment with stripe
		const result = await stripe?.confirmPayment({
			elements,
			redirect: 'if_required'
		});

		if (result?.error) {
			// payment failed, notify user
			processing = false;
			const message = result.error.message ?? 'Unbekannter Fehler beim Zahlungsvorgang';
			toast.error(message);
			error = message;
		} else {
			goto(`/board?payment=${PaymentStatus.SUCCESS}`, {
				replaceState: true
			});
		}
	}

	async function updateCart(quantity: number) {
		if (!user) return;
		try {
			processing = true;
			const { error: updateError } = await supabase
				.from('cart')
				.update({ quantity })
				.eq('userId', user.id);
			if (updateError) {
				throw updateError;
			}
		} catch (e) {
			console.log(e);
			Sentry.captureException(e);
			toast.error('Fehler beim Aktualisieren des Warenkorbs');
		} finally {
			processing = false;
		}
	}

	const debouncedCreatePaymentIntent = debounce((quantity: number) => {
		if (quantity > 0) {
			updateCart(quantity);
		}
	}, 500);
</script>

<div class="h-main flex w-full flex-col justify-center p-8">
	<div class="flex w-full flex-col items-center gap-x-8 gap-y-8 lg:flex-row lg:justify-around">
		<div class="flex h-full w-full max-w-[600px] flex-col gap-y-4">
			<div class="flex w-full flex-row items-center justify-end gap-x-2">
				<div class="flex flex-row flex-wrap gap-x-2">
					{#each quantityBadges as q}
						<Badge
							variant="outline"
							class="text-md flex h-7 w-12 cursor-pointer flex-row justify-center"
							onclick={() => {
								quantity = q;
								createPaymentIntent(q);
							}}>{q}€</Badge
						>
					{/each}
				</div>
				<div class="flex flex-row">
					<Label class="flex w-8 flex-row items-center justify-center bg-muted text-lg">€</Label>
					<Input
						class="h-8 w-16"
						bind:value={quantity}
						onchange={(e) =>
							debouncedCreatePaymentIntent(
								(e.target as HTMLInputElement).value as unknown as number
							)}
						placeholder="1"
						type="number"
						min={1}
						max={90}
					/>
				</div>
			</div>
			<Card.Root class="flex min-h-[460px] flex-col">
				<Card.Header>
					<Card.Title>{quantity} Mio. Tokens - {quantity * 4.0}€</Card.Title>
					<Card.Description>Inkl. Steuer</Card.Description>
				</Card.Header>
				<Separator class="mt-4" />
				<Card.Content class="box-border h-full">
					<div class="flex h-full flex-col justify-between gap-y-2">
						<div class="flex flex-col gap-y-2">
							<p>
								Oder ca.: {(quantity * 700_000).toLocaleString('de-DE')} Wörter,
								{(quantity * 70_000).toLocaleString('de-DE')} Absätze oder
								{(quantity * 1_400).toLocaleString('de-DE')} Seiten
							</p>
							<div class="mt-2 flex flex-row items-center gap-x-2 text-muted-foreground">
								<CircleAlert size={28} />
								<p>
									Tokens werden bei der Eingabe sowie der Ausgabe abgezogen! Das bedeutet 700 Seiten
									Eingabe und 700 Seiten Ausgabe.
								</p>
							</div>
						</div>
						<div class="flex flex-row items-center gap-x-4">
							<Checkbox id="terms-checkbox" bind:checked={termsAccepted} />
							<Label class="cursor-pointer" for="terms-checkbox">
								Ich stimme ausdrücklich zu, dass die Ausführung des Vertrags vor Ablauf der
								Widerrufsfrist beginnt und ich mit vollständiger Bereitstellung der Tokens mein
								Widerrufsrecht verliere.
							</Label>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
		<div class="flex w-full max-w-[600px] flex-col justify-center">
			{#if clientSecret}
				<Elements locale="de" {stripe} {clientSecret} theme="night" labels="floating" bind:elements>
					<form on:submit|preventDefault={submit}>
						<PaymentElement />
						<Address mode="billing" />
						<Button
							type="submit"
							variant="default"
							disabled={processing || loadingIntent || !termsAccepted}
							class="mt-4 w-full"
						>
							{#if processing}
								In Bearbeitung...
							{:else}
								Kaufen
							{/if}
						</Button>
					</form>
				</Elements>
			{:else if error}
				<div class="center-flex">
					<Alert.Root variant="destructive">
						<CircleAlert class="size-4" />
						<Alert.Title>Fehler beim Zahlungsanbieter</Alert.Title>
						<Alert.Description>{error}</Alert.Description>
					</Alert.Root>
				</div>
			{:else}
				<div class="center-flex">
					<Spinner size="2xl" />
				</div>
			{/if}
		</div>
	</div>
</div>

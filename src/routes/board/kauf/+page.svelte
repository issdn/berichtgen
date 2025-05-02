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
	import { PaymentStatus } from '$src/lib/types';

	const quantityBadges = [1, 2, 3, 5, 10];

	let stripe: Stripe | null = $state(null);
	let clientSecret = $state(null);
	let elements: StripeElements | null = $state(null);
	let processing: boolean = $state(false);
	let quantity: number = $state(1);
	let loadingIntent: boolean = $state(false);
	let error: string | null = $state(null);

	onMount(async () => {
		stripe = await loadStripe(PUBLIC_STRIPE_KEY, { locale: 'de' });

		// create payment intent server side
		await createPaymentIntent();
	});

	async function createPaymentIntent(quantity: number = 1) {
		loadingIntent = true;
		try {
			const response = await fetch(`/board/kauf/create-payment-intent?quantity=${quantity}`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				}
			});
			loadingIntent = false;
			clientSecret = (await response.json()).clientSecret;
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

	const debouncedCreatePaymentIntent = debounce((quantity: number) => {
		if (quantity > 0) {
			createPaymentIntent(quantity);
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
			<Card.Root class="min-h-[460px]">
				<Card.Header>
					<Card.Title>{quantity} Mio. Tokens - {quantity * 4.0}€</Card.Title>
					<Card.Description>Inkl. Steuer</Card.Description>
				</Card.Header>
				<Separator class="mt-4" />
				<Card.Content>
					<ul>
						<li><b>Das sind:</b></li>
						<li>700.000 Wörter</li>
						<li>70.000 Absätze</li>
						<li>1.400 Seiten</li>
					</ul>
				</Card.Content>
				<Card.Footer>
					<p>Terms</p>
				</Card.Footer>
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
							disabled={processing || loadingIntent}
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
						<Alert.Title>Fehler bei der Zahlung</Alert.Title>
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

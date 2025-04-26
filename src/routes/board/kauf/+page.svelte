<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		loadStripe,
		type Stripe,
		type StripeElements,
		type StripeError
	} from '@stripe/stripe-js';
	import { Elements, Address, LinkAuthenticationElement, PaymentElement } from 'svelte-stripe';
	import { PUBLIC_STRIPE_KEY } from '$env/static/public';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let stripe: Stripe | null = $state(null);
	let clientSecret = $state(null);
	let error: StripeError | null = $state(null);
	let elements: StripeElements | null = $state(null);
	let processing: boolean = $state(false);

	onMount(async () => {
		stripe = await loadStripe(PUBLIC_STRIPE_KEY, { locale: 'de' });

		// create payment intent server side
		clientSecret = await createPaymentIntent();
	});

	async function createPaymentIntent() {
		const response = await fetch('/board/kauf/create-payment-intent', {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({})
		});
		const { clientSecret } = await response.json();

		return clientSecret;
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
			error = result.error;
			processing = false;
		} else {
			// payment succeeded, redirect to "thank you" page
			goto('/board');
		}
	}
</script>

<div class="h-main flex w-full flex-row justify-center">
	<div></div>
	<div class="w-full max-w-[600px] p-8">
		{#if error}
			<Alert.Root variant="destructive">
				<CircleAlert class="size-4" />
				<Alert.Title>Fehler bei der Zahlung</Alert.Title>
				<Alert.Description>{error.message}</Alert.Description>
			</Alert.Root>
		{/if}
		{#if clientSecret}
			<Elements locale="de" {stripe} {clientSecret} theme="night" labels="floating" bind:elements>
				<form on:submit|preventDefault={submit}>
					<PaymentElement />
					<Address mode="billing" />

					<Button variant="default" disabled={processing} class="mt-4 w-full">
						{#if processing}
							In Bearbeitung...
						{:else}
							Kaufen
						{/if}
					</Button>
				</form>
			</Elements>
		{:else}
			Loading...
		{/if}
	</div>
</div>

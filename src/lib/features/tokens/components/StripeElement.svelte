<script lang="ts">
	import {
		loadStripe,
		type Stripe,
		type StripeElements
	} from '@stripe/stripe-js';
	import { PUBLIC_STRIPE_KEY } from '$env/static/public';
	import { Button } from '$ui/button/index.js';
	import { toast } from 'svelte-sonner';
	import { Spinner } from '$ui/spinner/index.js';
	import { resolve } from '$app/paths';
	import { Elements, Address, PaymentElement } from 'svelte-stripe';
	import { LANGUAGE_CODE } from '$lib/constants';
	import { AsyncResource } from '$core/async.svelte';
	import { failed } from '$ui/snippets.svelte';

	let { clientSecret, total }: { clientSecret: string; total: number } =
		$props();

	async function submit() {
		// elements.submit() must be called before confirmPayment() in the deferred flow.
		const { error: submitError } = await elements!.submit();
		if (submitError) {
			throw submitError;
		}

		const { error: confirmError } = await stripe!.confirmPayment({
			elements,
			clientSecret,
			confirmParams: {
				return_url: `${window.location.origin}${resolve('/board/user/kauf/callback')}`
			}
		});

		if (confirmError) {
			throw confirmError;
		}
	}

	let mutation = new AsyncResource(submit, {
		onError(e) {
			toast.error(e.message, {
				description: e.cause,
				duration: 10_000,
				closeButton: true
			});
		}
		// onSuccess: Stripe redirects the browser to return_url — never reached.
	});

	// Top-level await — Svelte buffers UI updates until both settle atomically.
	// The enclosing <svelte:boundary> shows the pending snippet in the meantime.
	const stripe: Stripe | null = await loadStripe(PUBLIC_STRIPE_KEY, {
		locale: LANGUAGE_CODE
	});

	let elements: StripeElements | undefined = $state(undefined);
</script>

<svelte:boundary {failed}>
	{#snippet pending()}
		<div class="flex justify-center py-8">
			<Spinner size="lg" />
		</div>
	{/snippet}

	<Elements
		locale={LANGUAGE_CODE}
		stripe={stripe!}
		{clientSecret}
		appearance={{ theme: 'night', labels: 'floating' }}
		bind:elements
	>
		<div class="flex flex-col gap-y-3">
			<PaymentElement />
			<Address mode="billing" />
			<Button
				onclick={() => mutation.execute()}
				type="submit"
				disabled={mutation.loading || !elements || !clientSecret}
				class="mt-2 w-full"
			>
				{#if mutation.loading}
					In Bearbeitung...
				{:else}
					{total}€ jetzt bezahlen
				{/if}
			</Button>
		</div>
	</Elements>
</svelte:boundary>

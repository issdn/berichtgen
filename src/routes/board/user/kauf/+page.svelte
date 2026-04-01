<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		loadStripe,
		type Stripe,
		type StripeElements
	} from '@stripe/stripe-js';
	import { Elements, Address, PaymentElement } from 'svelte-stripe';
	import { PUBLIC_STRIPE_KEY } from '$env/static/public';
	import { Button } from '$lib/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { debounce } from '$lib/utils';
	import * as Sentry from '@sentry/sveltekit';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card/index.js';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import { Label } from '$lib/components/ui/label';
	import { CircleAlert, CreditCard, Package } from '@lucide/svelte';
	import Stepper from '$lib/components/ui/Stepper.svelte';
	import { LOCALE, PRICE_PER_MILLION_TOKENS_EUR } from '$lib/constants';
	import { resolve } from '$app/paths';
	import { getPaymentIntent, updatePaymentIntent } from './kauf.remote';

	// Top-level await — Svelte buffers UI updates until both settle atomically.
	// The enclosing <svelte:boundary> shows the pending snippet in the meantime.
	const stripe: Stripe | null = await loadStripe(PUBLIC_STRIPE_KEY, {
		locale: 'de'
	});
	const initial = await getPaymentIntent();

	/** Quick-select quantities (multiples of 1 million tokens). */
	const quantityBadges = [1, 2, 3, 5];

	let quantity: number = $state(initial?.quantity ?? 1);
	let clientSecret: string | null = $state(initial?.clientSecret ?? null);
	let elements: StripeElements | undefined = $state(undefined);
	let processing: boolean = $state(false);
	let loadingIntent: boolean = $state(false);
	let termsAccepted: boolean = $state(false);

	/** 1 = Paketauswahl, 2 = Zahlungsdetails */
	let step: 1 | 2 = $state(1);

	/** Total price in euro for the selected quantity. */
	const totalEur = $derived(quantity * PRICE_PER_MILLION_TOKENS_EUR);

	/** Calls the remote function to update the PaymentIntent when quantity changes. */
	async function fetchPaymentIntent(qty: number) {
		loadingIntent = true;
		try {
			const result = await updatePaymentIntent({ quantity: qty });
			clientSecret = result?.clientSecret ?? null;
		} catch (e) {
			Sentry.captureException(e);
			toast.error(
				'Stripe-Fehler: ' +
					(e instanceof Error ? e.message : 'Ursache unbekannt')
			);
		} finally {
			loadingIntent = false;
		}
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (processing || elements === null) return;

		processing = true;

		const result = await stripe?.confirmPayment({
			elements,
			clientSecret: clientSecret!,
			confirmParams: {
				return_url: resolve('/board')
			}
		});

		if (result?.error) {
			processing = false;
			toast.error(
				result.error.message ?? 'Unbekannter Fehler beim Zahlungsvorgang'
			);
		} else {
			goto(resolve('/board'), { replaceState: true, invalidateAll: true });
		}
	}

	const debouncedFetchPaymentIntent = debounce((qty: number) => {
		if (qty > 0) fetchPaymentIntent(qty);
	}, 500);
</script>

<svelte:head>
	<title>Tokenskauf</title>
</svelte:head>

<svelte:boundary>
	{#snippet pending()}
		<div class="h-main center-flex">
			<Spinner size="2xl" />
		</div>
	{/snippet}

	{#snippet failed(error, reset)}
		<div class="h-main center-flex p-8">
			<Alert.Root variant="destructive" class="max-w-md">
				<CircleAlert class="size-4" />
				<Alert.Title>Fehler beim Zahlungsanbieter</Alert.Title>
				<Alert.Description>
					{error instanceof Error
						? error.message
						: 'Ein unbekannter Fehler ist aufgetreten.'}
				</Alert.Description>
				<Button variant="outline" class="mt-4" onclick={reset}
					>Erneut versuchen</Button
				>
			</Alert.Root>
		</div>
	{/snippet}

	<div class="min-h-main flex w-full flex-col items-center p-6 lg:p-10">
		<div class="flex w-full max-w-4xl flex-col">
			<!-- Step indicator -->
			<div class="mb-8">
				<Stepper
					steps={['Mengenauswahl', 'Zahlungsdetails']}
					currentStep={step}
				/>
			</div>

			<!-- Main content -->
			<div class="flex flex-1 flex-col gap-6 lg:flex-row lg:items-stretch">
				<!-- Left: step content -->
				<div class="flex w-full max-w-xl flex-col gap-y-4">
					{#if step === 1}
						<!-- ── Step 1: Paketauswahl ── -->
						<div class="flex flex-col gap-y-4">
							<!-- Quantity picker -->
							<Card.Root>
								<Card.Header class="pb-3">
									<Card.Title class="flex items-center gap-x-2 text-base">
										<Package class="size-4" />
										Menge wählen
									</Card.Title>
									<Card.Description
										>1 Million Tokens = {PRICE_PER_MILLION_TOKENS_EUR}€</Card.Description
									>
								</Card.Header>
								<Separator />
								<Card.Content class="pt-4">
									<div class="flex flex-row flex-wrap items-center gap-2">
										{#each quantityBadges as q (q)}
											<Badge
												variant={quantity === q ? 'default' : 'secondary'}
												class="cursor-pointer px-4 py-1.5 text-sm transition-colors"
												onclick={() => {
													quantity = q;
													fetchPaymentIntent(q);
												}}
											>
												{q}x
											</Badge>
										{/each}
										<div class="ml-auto flex items-center gap-x-1.5">
											<Label class="text-muted-foreground text-sm"
												>Manuell:</Label
											>
											<Input
												class="h-8 w-20"
												bind:value={quantity}
												onchange={(e) =>
													debouncedFetchPaymentIntent(
														(e.target as HTMLInputElement)
															.value as unknown as number
													)}
												placeholder="1"
												type="number"
												min={1}
												max={90}
											/>
										</div>
									</div>
								</Card.Content>
							</Card.Root>

							<!-- Info -->
							<Card.Root>
								<Card.Content class="pt-4">
									<p class="text-muted-foreground text-sm">
										Mit <strong class="text-foreground"
											>{quantity} Mio. Tokens</strong
										> kannst du ungefähr:
									</p>
									<ul class="text-muted-foreground mt-2 space-y-1 text-sm">
										<li>
											• {(quantity * 350_000).toLocaleString(LOCALE)} Wörter verarbeiten
										</li>
										<li>
											• {(quantity * 35_000).toLocaleString(LOCALE)} Absätze generieren
										</li>
										<li>
											• {(quantity * 700).toLocaleString(LOCALE)} Seiten erstellen
										</li>
									</ul>
									<div
										class="mt-3 flex items-start gap-x-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-3"
									>
										<CircleAlert
											class="mt-0.5 size-4 shrink-0 text-amber-500"
										/>
										<p class="text-muted-foreground text-xs">
											Tokens werden sowohl bei der Eingabe als auch bei der
											Ausgabe verbraucht.
										</p>
									</div>
								</Card.Content>
							</Card.Root>

							<!-- Widerrufsrecht -->
							<Card.Root class="border-border/60">
								<Card.Content class="pt-4">
									<div class="flex flex-row items-start gap-x-3">
										<Checkbox
											id="terms-checkbox"
											bind:checked={termsAccepted}
											class="mt-0.5"
										/>
										<Label
											class="text-muted-foreground cursor-pointer text-sm leading-relaxed"
											for="terms-checkbox"
										>
											Ich stimme ausdrücklich zu, dass die Ausführung des
											Vertrags vor Ablauf der Widerrufsfrist beginnt und ich mit
											vollständiger Bereitstellung der Tokens mein
											Widerrufsrecht verliere.
										</Label>
									</div>
								</Card.Content>
							</Card.Root>

							<Button
								onclick={() => (step = 2)}
								disabled={!termsAccepted || loadingIntent}
								class="w-full"
							>
								Weiter zur Zahlung
							</Button>
						</div>
					{:else}
						<!-- ── Step 2: Zahlungsdetails ── -->
						<div class="flex flex-col gap-y-4">
							<Card.Root>
								<Card.Header class="pb-3">
									<Card.Title class="flex items-center gap-x-2 text-base">
										<CreditCard class="size-4" />
										Zahlungsdetails
									</Card.Title>
								</Card.Header>
								<Separator />
								<Card.Content class="pt-4">
									{#if clientSecret}
										<Elements
											locale="de"
											stripe={stripe!}
											{clientSecret}
											appearance={{ theme: 'night', labels: 'floating' }}
											bind:elements
										>
											<form onsubmit={submit} class="flex flex-col gap-y-3">
												<PaymentElement />
												<Address mode="billing" />
												<Button
													type="submit"
													disabled={processing || loadingIntent}
													class="mt-2 w-full"
												>
													{#if processing}
														In Bearbeitung...
													{:else}
														{totalEur}€ jetzt bezahlen
													{/if}
												</Button>
											</form>
										</Elements>
									{:else}
										<div class="flex justify-center py-8">
											<Spinner size="lg" />
										</div>
									{/if}
								</Card.Content>
							</Card.Root>

							<Button
								variant="ghost"
								onclick={() => (step = 1)}
								class="text-muted-foreground w-full"
							>
								← Zurück zur Mengenauswahl
							</Button>
						</div>
					{/if}
				</div>

				<!-- Right: persistent summary -->
				<div class="w-full lg:max-w-xs">
					<Card.Root class="bg-muted/30 h-full">
						<Card.Header class="pb-3">
							<Card.Title class="text-base">Zusammenfassung</Card.Title>
						</Card.Header>
						<Separator />
						<Card.Content class="pt-4">
							<div class="flex flex-col gap-y-3 text-sm">
								<div class="flex justify-between">
									<span class="text-muted-foreground">Menge</span>
									<span class="font-medium">{quantity} Mio. Tokens</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Preis pro Mio.</span>
									<span>{PRICE_PER_MILLION_TOKENS_EUR}€</span>
								</div>
								<Separator />
								<div class="flex justify-between text-base font-semibold">
									<span>Gesamt</span>
									<span>{totalEur}€</span>
								</div>
								<p class="text-muted-foreground text-xs">
									Inkl. gesetzlicher Mehrwertsteuer
								</p>
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			</div>
		</div>
		<!-- /max-w-4xl -->
	</div>
</svelte:boundary>

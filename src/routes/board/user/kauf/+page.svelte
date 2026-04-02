<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { debounce } from '$lib/utils';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card/index.js';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import { Label } from '$lib/components/ui/label';
	import { CircleAlert, CreditCard, MoveLeft, Package } from '@lucide/svelte';
	import Stepper from '$lib/components/ui/Stepper.svelte';
	import { LOCALE, PRICE_PER_MILLION_TOKENS_EUR } from '$lib/constants';
	import { getPaymentIntent, updatePaymentIntent } from './kauf.remote';
	import StripeElement from '$lib/modules/tokens/components/StripeElement.svelte';
	import { Spinner } from '$ui/spinner';
	import { AsyncResource } from '$core/async.svelte';

	const debouncedFetchPaymentIntent = debounce((quantity: number) => {
		if (quantity > 0) mutation.execute({ quantity });
	}, 1000);

	const initial = await getPaymentIntent();

	let mutation = new AsyncResource(updatePaymentIntent, {
		initialValue: initial,
		onError(e) {
			toast.error(e.message, {
				description: e.cause,
				duration: 10_000,
				closeButton: true
			});
		}
	});

	/** Quick-select quantities (multiples of 1 million tokens). */
	const quantityBadges = [1, 2, 3, 5];

	let quantity: number = $state(initial?.quantity ?? 1);

	let termsAccepted: boolean = $state(false);

	/** 1 = Paketauswahl, 2 = Zahlungsdetails */
	let currentStep: 1 | 2 = $state(1);

	/** Total price in euro for the selected quantity. */
	const total = $derived(quantity * PRICE_PER_MILLION_TOKENS_EUR);
</script>

<svelte:head>
	<title>Tokenskauf</title>
</svelte:head>

<svelte:boundary>
	{#snippet pending()}
		<div class="h-main center-flex">
			<Spinner />
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
					steps={[
						{ label: 'Mengenauswahl' },
						{
							label: 'Zahlungsdetails',
							disabled:
								!termsAccepted ||
								!mutation.data?.clientSecret ||
								mutation.loading
						}
					]}
					bind:currentStep
				/>
			</div>

			<!-- Main content -->
			<div class="flex flex-1 flex-col gap-6 lg:flex-row lg:items-stretch">
				<!-- Left: step content -->
				<div class="flex w-full max-w-xl flex-col gap-y-4">
					{#if currentStep === 1}
						<!-- ── Step 1: Paketauswahl ── -->
						<div class="flex flex-col gap-y-4">
							<!-- Quantity picker -->
							<Card.Root>
								<Card.Header>
									<Card.Title class="flex items-center gap-x-2 text-base">
										<Package class="size-4" />
										Menge wählen
									</Card.Title>
									<Card.Description
										>1 Million Tokens = {PRICE_PER_MILLION_TOKENS_EUR}€</Card.Description
									>
								</Card.Header>
								<Separator />
								<Card.Content>
									<div class="flex flex-row flex-wrap items-center gap-2">
										{#each quantityBadges as q (q)}
											<Badge
												variant={quantity === q ? 'default' : 'secondary'}
												class="cursor-pointer px-4 py-1.5 text-sm transition-colors"
												onclick={mutation.loading
													? null
													: () => {
															quantity = q;
															mutation.execute({ quantity });
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
												disabled={mutation.loading}
												class="h-8 w-20"
												bind:value={quantity}
												onchange={(e) =>
													debouncedFetchPaymentIntent(
														parseInt((e.target as HTMLInputElement).value)
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
								<Card.Content>
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
								<Card.Content>
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
								onclick={() => (currentStep = 2)}
								disabled={!termsAccepted || mutation.loading}
								class="w-full"
							>
								Weiter zur Zahlung
							</Button>
						</div>
					{:else}
						<!-- ── Step 2: Zahlungsdetails ── -->
						<div class="flex flex-col gap-y-4">
							<Card.Root>
								<Card.Header>
									<Card.Title class="flex items-center gap-x-2 text-base">
										<CreditCard class="size-4" />
										Zahlungsdetails
									</Card.Title>
								</Card.Header>
								<Separator />
								<Card.Content>
									<StripeElement
										clientSecret={mutation.data!.clientSecret!}
										{total}
									/>
								</Card.Content>
							</Card.Root>

							<Button
								variant="ghost"
								onclick={() => (currentStep = 1)}
								class="text-muted-foreground w-full"
							>
								<MoveLeft /> Zurück zur Mengenauswahl
							</Button>
						</div>
					{/if}
				</div>

				<!-- Right: persistent summary -->
				<div class="w-full lg:max-w-xs">
					<Card.Root class="bg-muted/30">
						<Card.Header>
							<Card.Title class="text-base">Zusammenfassung</Card.Title>
						</Card.Header>
						<Separator />
						<Card.Content>
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
									<span>{total}€</span>
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

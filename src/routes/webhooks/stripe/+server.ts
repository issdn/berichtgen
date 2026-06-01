import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import { ECommonServerError } from '$lib/errors';
import {
	errResult,
	okResult,
	type Result,
	tryResult,
	tryResultAsync
} from '$lib/result';
import db from '$lib/server/db';
import { svelteApiError } from '$server/errors';
import * as Sentry from '@sentry/sveltekit';
import { json } from '@sveltejs/kit';
import { sql } from 'kysely';
import Stripe from 'stripe';

const stripe = new Stripe(STRIPE_SECRET_KEY);

/** Credits tokens for a successful PaymentIntent and removes the cart row. */
async function handlePaymentIntentSucceeded({
	event
}: {
	event: Stripe.Event;
}) {
	const pi = event.data.object as Stripe.PaymentIntent;
	const cartResult = await tryResultAsync({
		apiError: ECommonServerError.DATABASE_ERROR,
		promise: db
			.selectFrom('cart')
			.select(['user_id', 'quantity'])
			.where('intent_id', '=', pi.id)
			.executeTakeFirst()
	});
	if (!cartResult.ok) return cartResult;
	const cart = cartResult.data;
	if (!cart) return okResult(undefined);

	const { quantity, user_id: userId } = cart;
	const tokensToCredit = quantity * 1_000_000;

	const insertPurchaseResult = await tryResultAsync({
		apiError: ECommonServerError.DATABASE_ERROR,
		promise: db
			.insertInto('purchase')
			.values({
				quantity,
				stripe_event_id: event.id,
				stripe_intent_id: pi.id,
				tokens_credited: tokensToCredit,
				user_id: userId
			})
			.execute()
	});
	if (!insertPurchaseResult.ok) return insertPurchaseResult;

	const tokenUpdateResult = await tryResultAsync({
		apiError: ECommonServerError.DATABASE_ERROR,
		promise: db
			.updateTable('user_token_count')
			.set({ tokens: sql`tokens + ${tokensToCredit}` })
			.where('user_id', '=', userId)
			.execute()
	});
	if (!tokenUpdateResult.ok) return tokenUpdateResult;

	const clearCartResult = await tryResultAsync({
		apiError: ECommonServerError.DATABASE_ERROR,
		promise: db.deleteFrom('cart').where('intent_id', '=', pi.id).execute()
	});
	if (!clearCartResult.ok) return clearCartResult;

	return okResult(undefined);
}

/** Clears the cart row when a PaymentIntent is canceled. */
async function handlePaymentIntentCanceled({ event }: { event: Stripe.Event }) {
	const pi = event.data.object as Stripe.PaymentIntent;
	const clearCartResult = await tryResultAsync({
		apiError: ECommonServerError.DATABASE_ERROR,
		promise: db.deleteFrom('cart').where('intent_id', '=', pi.id).execute()
	});
	return clearCartResult;
}

/** Revokes previously credited tokens when a charge is refunded. */
async function handleChargeRefunded({ event }: { event: Stripe.Event }) {
	const charge = event.data.object as Stripe.Charge;
	const paymentIntentId =
		typeof charge.payment_intent === 'string'
			? charge.payment_intent
			: charge.payment_intent?.id;
	if (!paymentIntentId) {
		return errResult(ECommonServerError.VALIDATION_ERROR, {
			cause: 'Erstattungs-Webhook ohne PaymentIntent-ID.'
		});
	}

	const purchaseResult = await tryResultAsync({
		apiError: ECommonServerError.DATABASE_ERROR,
		promise: db
			.selectFrom('purchase')
			.select(['tokens_credited', 'user_id'])
			.where('stripe_intent_id', '=', paymentIntentId)
			.executeTakeFirst()
	});
	if (!purchaseResult.ok) return purchaseResult;
	const purchase = purchaseResult.data;
	if (!purchase) {
		return errResult(ECommonServerError.DATABASE_ERROR, {
			cause: 'Keine passende Zahlung zur Erstattung gefunden.'
		});
	}

	const revokeTokensResult = await tryResultAsync({
		apiError: ECommonServerError.DATABASE_ERROR,
		promise: db
			.updateTable('user_token_count')
			.set({ tokens: sql`GREATEST(tokens - ${purchase.tokens_credited}, 0)` })
			.where('user_id', '=', purchase.user_id)
			.execute()
	});
	return revokeTokensResult;
}

/** Converts a failed Result into a SvelteKit API error and throws it. */
function throwOnFailedResult({ result }: { result: Result<unknown> }): void {
	if (result.ok) return;
	Sentry.captureException(result.error);
	throw svelteApiError(result.error.apiError);
}

export async function POST({ request }) {
	const body = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		Sentry.captureException(new Error('No stripe signature found'));
		throw svelteApiError({
			...ECommonServerError.VALIDATION_ERROR,
			cause: 'Stripe-Signatur fehlt im Request-Header.'
		});
	}

	const eventResult = tryResult({
		apiError: ECommonServerError.VALIDATION_ERROR,
		run: () =>
			stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
	});
	if (!eventResult.ok) {
		Sentry.captureException(eventResult.error);
		throw svelteApiError({
			...ECommonServerError.VALIDATION_ERROR,
			cause: 'Ungültiger Stripe-Webhook-Request.'
		});
	}
	const event = eventResult.data;

	if (event.type === 'payment_intent.succeeded') {
		const result = await handlePaymentIntentSucceeded({ event });
		throwOnFailedResult({ result });
	}
	if (event.type === 'payment_intent.canceled') {
		const result = await handlePaymentIntentCanceled({ event });
		throwOnFailedResult({ result });
	}
	if (event.type === 'charge.refunded') {
		const result = await handleChargeRefunded({ event });
		throwOnFailedResult({ result });
	}

	return json({}, { status: 200 });
}

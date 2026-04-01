import Stripe from 'stripe';
import { json } from '@sveltejs/kit';
import { throwSvelteError, ECommonServerError } from '$lib/errors';
import * as Sentry from '@sentry/sveltekit';
import db from '$lib/server/db';
import { sql } from 'kysely';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '$env/static/private';

// init api client
const stripe = new Stripe(STRIPE_SECRET_KEY);

/** POST /webhooks/stripe — receives and processes Stripe webhook events. */
export async function POST({ request }) {
	const body = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		Sentry.captureException(new Error('No stripe signature found'));
		return throwSvelteError(ECommonServerError.VALIDATION_ERROR, 'No stripe signature found');
	}

	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
	} catch (err) {
		Sentry.captureException(err);
		return throwSvelteError(ECommonServerError.VALIDATION_ERROR, 'Invalid request');
	}

	if (event.type === 'payment_intent.succeeded') {
		const pi = event.data.object;

		// Look up our own stored cart data by intent_id — never rely on Stripe metadata
		// for business logic since it passes through an external system.
		const cart = await db
			.selectFrom('cart')
			.select(['user_id', 'quantity'])
			.where('intent_id', '=', pi.id)
			.executeTakeFirst();

		if (!cart) {
			// Cart already deleted by a prior successful event delivery — safe to ack.
			return json({}, { status: 200 });
		}

		const { user_id: userId, quantity } = cart;
		const tokensToCredit = quantity * 1_000_000;

		try {
			// Insert a purchase record keyed on stripe_event_id (UNIQUE).
			// If a concurrent or duplicate webhook fires, this insert throws a unique
			// violation — we catch it and return 200 so Stripe stops retrying.
			await db
				.insertInto('purchase')
				.values({
					stripe_event_id: event.id,
					stripe_intent_id: pi.id,
					user_id: userId,
					quantity,
					tokens_credited: tokensToCredit
				})
				.execute();
		} catch {
			// Already processed — acknowledge without crediting again.
			return json({}, { status: 200 });
		}

		try {
			await db
				.updateTable('user_token_count')
				.set({ tokens: sql`tokens + ${tokensToCredit}` })
				.where('user_id', '=', userId)
				.execute();
		} catch (err) {
			Sentry.captureException(err);
			return throwSvelteError(ECommonServerError.DATABASE_ERROR, "Couldn't update token balance");
		}

		// Best-effort cart cleanup — no-op if already deleted.
		await db.deleteFrom('cart').where('intent_id', '=', pi.id).execute();
	}

	return json({}, { status: 200 });
}

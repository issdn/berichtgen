import Stripe from 'stripe';
import { json } from '@sveltejs/kit';
import { throwSvelteError, ECommonServerError } from '$lib/errors';
import * as Sentry from '@sentry/sveltekit';
import { db } from '$lib/server/db';
import { sql } from 'kysely';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '$env/static/private';

// init api client
const stripe = new Stripe(STRIPE_SECRET_KEY);

// endpoint to handle incoming webhooks
export async function POST({ request }) {
	// extract body
	const body = await request.text();

	// get the signature from the header
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		Sentry.captureException(new Error('No stripe signature found'));
		return throwSvelteError(
			ECommonServerError.VALIDATION_ERROR,
			'No stripe signature found'
		);
	}

	// var to hold event data
	let event;

	// verify it
	try {
		event = stripe.webhooks.constructEvent(
			body,
			signature,
			STRIPE_WEBHOOK_SECRET
		);
	} catch (err) {
		Sentry.captureException(err);
		return throwSvelteError(
			ECommonServerError.VALIDATION_ERROR,
			'Invalid request'
		);
	}

	if (event.type === 'payment_intent.succeeded') {
		const pi = event.data.object;
		const userId = pi.metadata?.userId;
		const quantity = parseInt(pi.metadata?.quantity ?? '0', 10);

		if (!userId || !quantity) {
			Sentry.captureException(new Error('Missing metadata on PI: ' + pi.id));
			return throwSvelteError(
				ECommonServerError.VALIDATION_ERROR,
				'Missing metadata on PI: ' + pi.id
			);
		}

		try {
			const amount = quantity * 1_000_000;
			await db
				.updateTable('user_token_count')
				.set({ tokens: sql`tokens + ${amount}` })
				.where('user_id', '=', userId)
				.execute();
		} catch (err) {
			Sentry.captureException(err);
			return throwSvelteError(
				ECommonServerError.DATABASE_ERROR,
				"Couldn't update token balance"
			);
		}

		// Best-effort cleanup — if already deleted (duplicate event) this is a no-op.
		await db.deleteFrom('cart').where('intent_id', '=', pi.id).execute();
	}

	return json({}, { status: 200 });
}

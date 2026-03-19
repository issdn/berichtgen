import Stripe from 'stripe';
import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import * as Sentry from '@sentry/node';
import { db } from '$lib/server/db';
import { sql } from 'kysely';

// init api client
const stripe = new Stripe(env.SECRET_STRIPE_KEY);

// endpoint to handle incoming webhooks
export async function POST({ request }) {
	// extract body
	const body = await request.text();

	// get the signature from the header
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		Sentry.captureException(new Error('No stripe signature found'));
		return error(400, 'No stripe signature found');
	}

	// var to hold event data
	let event;

	// verify it
	try {
		event = stripe.webhooks.constructEvent(body, signature, env.PRIVATE_STRIPE_WEBHOOK_SECRET);
	} catch (err) {
		Sentry.captureException(err);
		return error(400, 'Invalid request');
	}

	// signature has been verified, so we can process events
	// full list of events: https://stripe.com/docs/api/events/list
	if (event.type == 'charge.succeeded') {
		// get data object
		const userId = event.data.object.metadata.userId;
		if (!userId) {
			Sentry.captureException(new Error('User ID not found in metadata'));
			return error(400, 'User ID not found in metadata');
		}

		const cartRow = await db
			.selectFrom('cart')
			.select('quantity')
			.where('user_id', '=', userId)
			.orderBy('created_at', 'desc')
			.executeTakeFirst();

		if (!cartRow) {
			Sentry.captureException(new Error('No cart found for user'));
			return error(400, 'No cart found for user');
		}

		try {
			const amount = cartRow.quantity * 1_000_000;
			await db
				.updateTable('user_token_count')
				.set({ tokens: sql`tokens + ${amount}` })
				.where('user_id', '=', userId)
				.execute();
			await db.deleteFrom('cart').where('user_id', '=', userId).execute();
		} catch (err) {
			Sentry.captureException(err);
			return error(500, "Couldn't find user in database");
		}
	}

	return json({}, { status: 200 });
}

import Stripe from 'stripe';
import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import * as Sentry from '@sentry/node';
import { db } from '$src/lib/server/db/index.js';
import { cart, usersTokens } from '$src/lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

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
		const quantity = parseInt(event.data.object.metadata.quantity);
		if (!quantity) {
			Sentry.captureException(new Error('Quantity not found in metadata'));
			return error(400, 'Quantity not found in metadata');
		}
		if (!userId) {
			Sentry.captureException(new Error('User ID not found in metadata'));
			return error(400, 'User ID not found in metadata');
		}
		try {
			const current = await db
				.select({ tokens: usersTokens.tokens })
				.from(usersTokens)
				.where(eq(usersTokens.userId, userId));
			await db
				.update(usersTokens)
				.set({ tokens: current[0].tokens + quantity * 1_000_000 })
				.where(eq(usersTokens.userId, userId));
			await db.delete(cart).where(eq(cart.userId, userId));
		} catch (err) {
			Sentry.captureException(err);
			return error(500, "Couldn't find user in database");
		}
	}

	return json({}, { status: 200 });
}

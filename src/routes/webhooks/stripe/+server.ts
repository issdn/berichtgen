import Stripe from 'stripe';
import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import * as Sentry from '@sentry/node';

// init api client
const stripe = new Stripe(env.SECRET_STRIPE_KEY);

// endpoint to handle incoming webhooks
export async function POST({ request, locals: { supabase } }) {
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

		const { data, error: cartError } = await supabase
			.from('cart')
			.select('quantity')
			.eq('userId', userId)
			.order('createdAt', { ascending: false })
			.limit(1);

		if (cartError || !data[0]) {
			Sentry.captureException(error);
			return error(400, 'No cart found for user');
		}

		try {
			const { error: updateError } = await supabase.rpc('add_user_tokens', {
				user_id: userId,
				amount: data[0].quantity * 1_000_000
			});

			if (updateError) {
				throw updateError;
			}

			// Delete cart
			const { error: deleteError } = await supabase.from('cart').delete().eq('userId', userId);

			if (deleteError) {
				throw deleteError;
			}
		} catch (err) {
			Sentry.captureException(err);
			return error(500, "Couldn't find user in database");
		}
	}

	return json({}, { status: 200 });
}

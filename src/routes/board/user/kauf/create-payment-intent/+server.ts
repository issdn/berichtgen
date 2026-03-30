import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';
import * as Sentry from '@sentry/sveltekit';
import { ECommonServerError, throwSvelteError } from '$lib/errors';
import db from '$lib/server/db';
// initialize Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY);

// handle POST /create-payment-intent
export async function POST({ locals: { safeGetSession }, url }) {
	const userId = (await safeGetSession())?.user?.id;

	if (!userId) {
		throwSvelteError(ECommonServerError.UNAUTHORIZED);
	}

	const quantity = parseInt(url.searchParams.get('quantity') || '1');

	if (isNaN(quantity) || quantity <= 0 || quantity > 90) {
		throwSvelteError(
			ECommonServerError.VALIDATION_ERROR,
			'Die Menge muss zwischen 1 und 90 liegen'
		);
	}

	try {
		const updated = await db
			.updateTable('cart')
			.set({ quantity })
			.where('user_id', '=', userId!)
			.returning(['intent_id', 'quantity'])
			.executeTakeFirst();

		if (updated) {
			const paymentIntent = await stripe.paymentIntents.update(
				updated.intent_id,
				{
					amount: quantity * 400,
					metadata: { userId: userId!, quantity }
				}
			);
			return json({
				clientSecret: paymentIntent.client_secret
			});
		}
	} catch {
		/* Just create a new intent */
	}

	try {
		const paymentIntent = await stripe.paymentIntents.create({
			amount: quantity * 400,
			metadata: { userId: userId!, quantity: quantity },
			currency: 'eur',
			payment_method_types: ['card']
		});

		await db
			.insertInto('cart')
			.values({ intent_id: paymentIntent.id, user_id: userId!, quantity })
			.execute();

		return json({
			clientSecret: paymentIntent.client_secret
		});
	} catch (err) {
		let errorMessage =
			'Unbekannter Fehler bei Erstellung eines Zahlungsvorgangs';
		if (err instanceof Stripe.errors.StripeError) {
			Sentry.captureException(err);
			errorMessage = err.message;
		}
		throwSvelteError(ECommonServerError.STRIPE_ERROR, errorMessage);
	}
}

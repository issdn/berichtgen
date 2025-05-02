import Stripe from 'stripe';
import { SECRET_STRIPE_KEY } from '$env/static/private';
import { error, json } from '@sveltejs/kit';
import * as Sentry from '@sentry/node';
import { CommonServerErrorTypes } from '$src/lib/types.js';

// initialize Stripe
const stripe = new Stripe(SECRET_STRIPE_KEY);

// handle POST /create-payment-intent
export async function POST({ locals: { user }, request }) {
	const userId = user?.id;

	if (!userId) {
		return error(401, { type: CommonServerErrorTypes.UNAUTHORIZED });
	}

	const quantity = parseInt(request.headers.get('quantity') || '1');

	if (isNaN(quantity) || quantity <= 0 || quantity > 90) {
		return error(400, {
			type: CommonServerErrorTypes.VALIDATION_ERROR,
			message: 'Die Menge muss zwischen 1 und 90 liegen'
		});
	}

	try {
		const paymentIntent = await stripe.paymentIntents.create({
			amount: quantity * 400,
			metadata: {
				userId,
				quantity
			},
			// note, for some EU-only payment methods it must be EUR
			currency: 'eur',
			// specify what payment methods are allowed
			// can be card, sepa_debit, ideal, etc...
			payment_method_types: ['card']
		});

		return json({
			clientSecret: paymentIntent.client_secret
		});
	} catch (err) {
		let errorMessage = 'Unbekannter Fehler beim Kauf';
		if (err instanceof Stripe.errors.StripeError) {
			Sentry.captureException(err);
			errorMessage = err.message;
		}
		return error(500, {
			type: CommonServerErrorTypes.STRIPE_ERROR,
			message: errorMessage
		});
	}
}

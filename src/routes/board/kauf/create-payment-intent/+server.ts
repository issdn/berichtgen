import Stripe from 'stripe';
import { SECRET_STRIPE_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';
import * as Sentry from '@sentry/node';

// initialize Stripe
const stripe = new Stripe(SECRET_STRIPE_KEY);

// handle POST /create-payment-intent
export async function POST(event) {
	const session = await event.locals.auth();
	const userId = session?.user?.id;

	const quantity = parseInt(event.request.headers.get('quantity') || '1');

	if (isNaN(quantity) || quantity <= 0 || quantity > 90) {
		return json({ error: 'Quantität soll zwischen 1 und 90 liegen.' }, { status: 400 });
	}

	if (!userId) {
		Sentry.captureException(new Error('User not authenticated during payment intent creation'));
		return json({ error: 'Unauthorized' }, { status: 401 });
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
		return json({ error: errorMessage }, { status: 500 });
	}
}

import Stripe from 'stripe';
import { SECRET_STRIPE_KEY } from '$env/static/private';
import { error, json } from '@sveltejs/kit';
import * as Sentry from '@sentry/node';
import { CommonServerError } from '$src/lib/errors';
import { supabaseAdmin } from '$src/lib/server/admin';
// initialize Stripe
const stripe = new Stripe(SECRET_STRIPE_KEY);

// handle POST /create-payment-intent
export async function POST({ locals: { safeGetSession }, url }) {
	const userId = (await safeGetSession())?.user?.id;

	if (!userId) {
		return error(401, {
			type: CommonServerError.UNAUTHORIZED.code,
			message: CommonServerError.UNAUTHORIZED.message
		});
	}

	const quantity = parseInt(url.searchParams.get('quantity') || '1');

	if (isNaN(quantity) || quantity <= 0 || quantity > 90) {
		return error(400, {
			type: CommonServerError.VALIDATION_ERROR.code,
			message: 'Die Menge muss zwischen 1 und 90 liegen'
		});
	}

	try {
		const { data: cartData } = await supabaseAdmin
			.from('cart')
			.update({ quantity })
			.eq('userId', userId)
			.select('intentId, quantity')
			.single();

		if (cartData) {
			const paymentIntent = await stripe.paymentIntents.retrieve(cartData.intentId);
			paymentIntent.amount = cartData.quantity * 400;
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
			metadata: { userId, quantity: quantity },
			currency: 'eur',
			payment_method_types: ['card']
		});

		const { error: cartError } = await supabaseAdmin
			.from('cart')
			.insert({ intentId: paymentIntent.id, userId, quantity });

		if (cartError) throw cartError;

		return json({
			clientSecret: paymentIntent.client_secret
		});
	} catch (err) {
		let errorMessage = 'Unbekannter Fehler bei Erstellung eines Zahlungsvorgangs';
		if (err instanceof Stripe.errors.StripeError) {
			Sentry.captureException(err);
			errorMessage = err.message;
		}
		return error(500, {
			type: CommonServerError.STRIPE_ERROR.code,
			message: errorMessage
		});
	}
}

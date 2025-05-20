import Stripe from 'stripe';
import { SECRET_STRIPE_KEY } from '$env/static/private';
import { error, json } from '@sveltejs/kit';
import * as Sentry from '@sentry/node';
import { CommonServerErrorTypes, KaufOperation } from '$src/lib/types.js';
// initialize Stripe
const stripe = new Stripe(SECRET_STRIPE_KEY);

// handle POST /create-payment-intent
export async function POST({ locals: { user, supabase }, url }) {
	const userId = user?.id;

	if (!userId) {
		return error(401, { type: CommonServerErrorTypes.UNAUTHORIZED, message: 'Nicht autorisiert' });
	}

	const quantity = parseInt(url.searchParams.get('quantity') || '1');

	const operation = url.searchParams.get('operation') as KaufOperation | null;

	if (isNaN(quantity) || quantity <= 0 || quantity > 90) {
		return error(400, {
			type: CommonServerErrorTypes.VALIDATION_ERROR,
			message: 'Die Menge muss zwischen 1 und 90 liegen'
		});
	}

	if (operation === KaufOperation.UPDATE) {
		try {
			const { data: cartData } = await supabase
				.from('cart')
				.select('intentId')
				.eq('userId', userId)
				.single();

			if (cartData) {
				const paymentIntent = await stripe.paymentIntents.retrieve(cartData.intentId);
				paymentIntent.amount = quantity * 400;
				return json({
					clientSecret: paymentIntent.client_secret
				});
			}
		} catch {
			/* Just create a new intent */
		}
	}

	try {
		const { data: cartData, error: cartError } = await supabase
			.from('cart')
			.select('quantity')
			.eq('userId', userId)
			.single();

		if (cartError || !cartData) throw cartError;

		const inCartQuantity = cartData.quantity;
		const paymentIntent = await stripe.paymentIntents.create({
			amount: inCartQuantity * 400,
			metadata: { userId, quantity: inCartQuantity },
			currency: 'eur',
			payment_method_types: ['card']
		});

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
			type: CommonServerErrorTypes.STRIPE_ERROR,
			message: errorMessage
		});
	}
}

/**
 * Pure business-logic handlers for purchase (Kauf) server operations.
 *
 * This module is intentionally side-effect-free with respect to UI — no toasts,
 * no store mutations. All presentation concerns live in the calling component.
 *
 * `kauf.remote.ts` is the thin transport shell that wires these functions
 * into SvelteKit remote functions.
 */

import { STRIPE_SECRET_KEY } from '$env/static/private';
import { PRICE_PER_MILLION_TOKENS_CENTS } from '$lib/constants';
import { ECommonServerError } from '$lib/errors';
import { tryResultAsync } from '$lib/result';
import db from '$lib/server/db';
import { svelteApiError } from '$server/errors';
import * as Sentry from '@sentry/sveltekit';
import Stripe from 'stripe';

const stripe = new Stripe(STRIPE_SECRET_KEY);

/**
 * Creates or updates a Stripe PaymentIntent for the given authenticated user.
 *
 * - If a cart row already exists, the existing PI is updated with the new amount.
 * - Otherwise a new PI is created and stored in the cart table.
 *
 * @param userId   - Validated, authenticated user ID.
 * @param quantity - Number of token bundles (1–90).
 * @returns The Stripe client secret needed by Stripe Elements.
 */
export async function handleCreatePaymentIntent(
	userId: string,
	quantity: number
): Promise<{ clientSecret: null | string }> {
	const existing = await db
		.selectFrom('cart')
		.select('intent_id')
		.where('user_id', '=', userId)
		.executeTakeFirst();

	if (existing) {
		await db
			.updateTable('cart')
			.set({ quantity })
			.where('user_id', '=', userId)
			.execute();

		const paymentIntentResult = await tryResultAsync({
			apiError: ECommonServerError.STRIPE_ERROR,
			promise: stripe.paymentIntents.update(existing.intent_id, {
				amount: quantity * PRICE_PER_MILLION_TOKENS_CENTS
			})
		});
		if (paymentIntentResult.ok) {
			const paymentIntent = paymentIntentResult.data;
			return { clientSecret: paymentIntent.client_secret };
		}
		Sentry.captureException(paymentIntentResult.error);
		throw svelteApiError(
			ECommonServerError.STRIPE_ERROR,
			paymentIntentResult.error.message
		);
	}

	const paymentIntentResult = await tryResultAsync({
		apiError: ECommonServerError.STRIPE_ERROR,
		promise: stripe.paymentIntents.create({
			amount: quantity * PRICE_PER_MILLION_TOKENS_CENTS,
			currency: 'eur',
			payment_method_types: ['card']
		})
	});
	if (!paymentIntentResult.ok) {
		Sentry.captureException(paymentIntentResult.error);
		throw svelteApiError(
			ECommonServerError.STRIPE_ERROR,
			paymentIntentResult.error.message
		);
	}
	const paymentIntent = paymentIntentResult.data;

	await db
		.insertInto('cart')
		.values({ intent_id: paymentIntent.id, quantity, user_id: userId })
		.execute();

	return { clientSecret: paymentIntent.client_secret };
}

/**
 * Looks up the user's active cart quantity and creates or returns the
 * corresponding PaymentIntent. Used for the SSR-safe initial page load.
 *
 * @param userId - Validated, authenticated user ID.
 * @returns Client secret and the quantity that was used.
 */
export async function handleGetPaymentIntent(
	userId: string
): Promise<{ clientSecret: null | string; quantity: number }> {
	const cart = await db
		.selectFrom('cart')
		.select('quantity')
		.where('user_id', '=', userId)
		.executeTakeFirst();

	const quantity = cart?.quantity ?? 1;
	const result = await handleCreatePaymentIntent(userId, quantity);
	return { ...result, quantity };
}

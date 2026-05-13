/**
 * Pure business-logic handlers for purchase (Kauf) server operations.
 *
 * This module is intentionally side-effect-free with respect to UI — no toasts,
 * no store mutations. All presentation concerns live in the calling component.
 *
 * `kauf.remote.ts` is the thin transport shell that wires these functions
 * into SvelteKit remote functions.
 */

import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';
import * as Sentry from '@sentry/sveltekit';
import db from '$lib/server/db';
import {
	BerichtgenError,
	ECommonServerError,
	throwSvelteError
} from '$lib/errors';
import { PRICE_PER_MILLION_TOKENS_CENTS } from '$lib/constants';
import { tryResultAsync } from '$lib/result';

const stripe = new Stripe(STRIPE_SECRET_KEY);

/**
 * Looks up the user's active cart quantity and creates or returns the
 * corresponding PaymentIntent. Used for the SSR-safe initial page load.
 *
 * @param userId - Validated, authenticated user ID.
 * @returns Client secret and the quantity that was used.
 */
export async function handleGetPaymentIntent(
	userId: string
): Promise<{ clientSecret: string | null; quantity: number }> {
	const cart = await db
		.selectFrom('cart')
		.select('quantity')
		.where('user_id', '=', userId)
		.executeTakeFirst();

	const quantity = cart?.quantity ?? 1;
	const result = await handleCreatePaymentIntent(userId, quantity);
	return { ...result, quantity };
}

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
): Promise<{ clientSecret: string | null }> {
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

		const paymentIntentResult = await tryResultAsync(
			stripe.paymentIntents.update(existing.intent_id, {
				amount: quantity * PRICE_PER_MILLION_TOKENS_CENTS
			}),
			BerichtgenError,
			ECommonServerError.STRIPE_ERROR
		);
		if (paymentIntentResult.ok) {
			const paymentIntent = paymentIntentResult.data;
			return { clientSecret: paymentIntent.client_secret };
		}
		Sentry.captureException(paymentIntentResult.error);
		return throwSvelteError(
			ECommonServerError.STRIPE_ERROR,
			paymentIntentResult.error.message
		);
	}

	const paymentIntentResult = await tryResultAsync(
		stripe.paymentIntents.create({
			amount: quantity * PRICE_PER_MILLION_TOKENS_CENTS,
			currency: 'eur',
			payment_method_types: ['card']
		}),
		BerichtgenError,
		ECommonServerError.STRIPE_ERROR
	);
	if (!paymentIntentResult.ok) {
		Sentry.captureException(paymentIntentResult.error);
		return throwSvelteError(
			ECommonServerError.STRIPE_ERROR,
			paymentIntentResult.error.message
		);
	}
	const paymentIntent = paymentIntentResult.data;

	await db
		.insertInto('cart')
		.values({ intent_id: paymentIntent.id, user_id: userId, quantity })
		.execute();

	return { clientSecret: paymentIntent.client_secret };
}

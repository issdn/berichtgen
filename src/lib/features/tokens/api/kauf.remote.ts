/**
 * Remote function transport shell for purchase (Kauf) operations.
 */

import { getRequestEvent } from '$app/server';
import { guardedCommand, guardedQuery } from '$lib/server/remote';
import { withRateLimit } from '$server/rate_limit';
import * as z from 'zod';

import {
	handleCreatePaymentIntent,
	handleGetPaymentIntent
} from './kauf.handlers';

const quantitySchema = z.object({
	quantity: z.number().int().min(1).max(90)
});

/**
 * SSR-safe initial fetch of the user's current payment intent.
 */
export const getPaymentIntent = guardedQuery(z.void(), async () => {
	const userId = getRequestEvent().locals.user!.id;
	return handleGetPaymentIntent(userId);
});

/**
 * Client-only mutation that updates the PaymentIntent for the chosen quantity.
 */
export const updatePaymentIntent = guardedCommand(
	quantitySchema,
	async ({ quantity }) =>
		withRateLimit({
			policyId: 'update-payment-intent',
			fn: async () => {
				const userId = getRequestEvent().locals.user!.id;
				return handleCreatePaymentIntent(userId, quantity);
			}
		})
);

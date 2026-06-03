/**
 * Remote function transport shell for purchase (Kauf) operations.
 *
 * This file is intentionally thin — it only handles:
 *   1. Input schema validation (via zod)
 *   2. Authentication via `getRequestEvent`
 *   3. Delegating to the pure business-logic functions in `api/kauf`
 *
 * All actual logic lives in `handlers/kauf.ts` so it can be unit-tested
 * without the remote-function transport layer.
 *
 * Two flavors:
 *   - `getPaymentIntent`    — `query`   — SSR-safe, used for the initial top-level await
 *   - `updatePaymentIntent` — `command` — client-only, used for quantity changes
 */

import { getRequestEvent } from '$app/server';
import { guardedCommand, guardedQuery } from '$lib/server/remote';
import * as z from 'zod';

import {
	handleCreatePaymentIntent,
	handleGetPaymentIntent
} from './kauf.handlers';

const quantitySchema = z.object({
	quantity: z.number().int().min(1).max(90)
});

/**
 * SSR-safe initial fetch — looks up the user's cart quantity and returns
 * the corresponding client secret. No input needed; quantity comes from the DB.
 */
export const getPaymentIntent = guardedQuery(z.void(), async () => {
	const userId = getRequestEvent().locals.user!.id;
	return handleGetPaymentIntent(userId);
});

/**
 * Client-only mutation — updates the PaymentIntent when the user changes quantity.
 * Cannot be called during SSR.
 */
export const updatePaymentIntent = guardedCommand(
	quantitySchema,
	async ({ quantity }) => {
		const userId = getRequestEvent().locals.user!.id;
		return handleCreatePaymentIntent(userId, quantity);
	}
);

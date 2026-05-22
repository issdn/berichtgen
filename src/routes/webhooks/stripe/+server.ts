import Stripe from 'stripe';
import { json } from '@sveltejs/kit';
import {
	BerichtgenError,
	svelteApiError,
	ECommonServerError
} from '$lib/errors';
import * as Sentry from '@sentry/sveltekit';
import db from '$lib/server/db';
import { sql } from 'kysely';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import { tryResult, tryResultAsync } from '$lib/result';

const stripe = new Stripe(STRIPE_SECRET_KEY);

export async function POST({ request }) {
	const body = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		Sentry.captureException(new Error('No stripe signature found'));
		throw svelteApiError(
			ECommonServerError.VALIDATION_ERROR,
			'No stripe signature found'
		);
	}

	const eventResult = tryResult(
		() =>
			stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET),
		BerichtgenError,
		ECommonServerError.VALIDATION_ERROR
	);
	if (!eventResult.ok) {
		Sentry.captureException(eventResult.error);
		throw svelteApiError(
			ECommonServerError.VALIDATION_ERROR,
			'Invalid request'
		);
	}
	const event = eventResult.data;

	if (event.type === 'payment_intent.succeeded') {
		const pi = event.data.object;
		const cart = await db
			.selectFrom('cart')
			.select(['user_id', 'quantity'])
			.where('intent_id', '=', pi.id)
			.executeTakeFirst();

		if (!cart) return json({}, { status: 200 });

		const { user_id: userId, quantity } = cart;
		const tokensToCredit = quantity * 1_000_000;

		const insertPurchaseResult = await tryResultAsync(
			db
				.insertInto('purchase')
				.values({
					stripe_event_id: event.id,
					stripe_intent_id: pi.id,
					user_id: userId,
					quantity,
					tokens_credited: tokensToCredit
				})
				.execute(),
			BerichtgenError,
			ECommonServerError.DATABASE_ERROR
		);
		if (!insertPurchaseResult.ok) return json({}, { status: 200 });

		const tokenUpdateResult = await tryResultAsync(
			db
				.updateTable('user_token_count')
				.set({ tokens: sql`tokens + ${tokensToCredit}` })
				.where('user_id', '=', userId)
				.execute(),
			BerichtgenError,
			ECommonServerError.DATABASE_ERROR
		);
		if (!tokenUpdateResult.ok) {
			Sentry.captureException(tokenUpdateResult.error);
			throw svelteApiError(
				ECommonServerError.DATABASE_ERROR,
				"Couldn't update token balance"
			);
		}

		await db.deleteFrom('cart').where('intent_id', '=', pi.id).execute();
	}

	return json({}, { status: 200 });
}

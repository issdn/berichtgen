import { readVertexAiConsentGranted } from '$core/auth/api/consent.handlers';
import { ECommonServerError } from '$lib/errors';
import { tryResultAsync } from '$lib/result';
import db from '$server/db';
import * as Sentry from '@sentry/sveltekit';
import { loadFlash } from 'sveltekit-flash-message/server';

export const load = loadFlash(
	async ({ depends, locals: { session, user } }) => {
		depends('user:tokenCount');
		depends('user:vertexAiConsent');

		if (!user) {
			return {
				session,
				tokenCount: null,
				vertexAiConsentGranted: false
			};
		}

		let tokenCount = 0;

		const tokenRowResult = await tryResultAsync({
			apiError: ECommonServerError.DATABASE_ERROR,
			promise: db
				.insertInto('user_token_count')
				.values({ user_id: user.id })
				.onConflict((oc) =>
					// No-op update so Postgres returns the existing row on conflict.
					// Caveat: this is still a real UPDATE, so it will fire update
					// triggers and touch updated_at-style columns if that table has them.
					oc.column('user_id').doUpdateSet({
						user_id: (eb) => eb.ref('excluded.user_id')
					})
				)
				.returning('tokens')
				.executeTakeFirst()
		});
		if (tokenRowResult.ok) {
			tokenCount = tokenRowResult.data?.tokens ?? 0;
		} else {
			Sentry.captureException(tokenRowResult.error);
		}

		const userMetadata =
			(await db
				.selectFrom('user_metadata')
				.selectAll()
				.where('user_id', '=', user.id)
				.executeTakeFirst()) ?? null;

		const vertexAiConsentResult = await readVertexAiConsentGranted({
			userId: user.id
		});
		if (!vertexAiConsentResult.ok) {
			Sentry.captureException(vertexAiConsentResult.error);
		}

		return {
			session,
			tokenCount,
			user,
			userMetadata,
			vertexAiConsentGranted: vertexAiConsentResult.ok
				? vertexAiConsentResult.data
				: false
		};
	}
) as unknown as import('./$types').LayoutServerLoad;

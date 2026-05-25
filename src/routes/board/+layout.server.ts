import { ECommonServerError } from '$lib/errors';
import { tryResultAsync } from '$lib/result';
import db from '$server/db';
import * as Sentry from '@sentry/sveltekit';
import { loadFlash } from 'sveltekit-flash-message/server';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = loadFlash(
	async ({ depends, locals: { session, user } }) => {
		depends('user:tokenCount');

		if (!user) {
			return {
				session,
				tokenCount: null
			};
		}

		let tokenCount = 0;

		const tokenRow = await db
			.selectFrom('user_token_count')
			.select('tokens')
			.where('user_id', '=', user.id)
			.executeTakeFirst();

		if (tokenRow) {
			tokenCount = tokenRow.tokens;
		} else {
			const insertedResult = await tryResultAsync({
				apiError: ECommonServerError.DATABASE_ERROR,
				promise: db
					.insertInto('user_token_count')
					.values({ tokens: 0, user_id: user.id })
					.onConflict((oc) => oc.column('user_id').doNothing())
					.returning('tokens')
					.executeTakeFirst()
			});
			if (insertedResult.ok) {
				tokenCount = insertedResult.data?.tokens ?? 0;
			} else {
				Sentry.captureException(insertedResult.error);
			}
		}

		const userMetadata =
			(await db
				.selectFrom('user_metadata')
				.selectAll()
				.where('user_id', '=', user.id)
				.executeTakeFirst()) ?? null;

		return {
			session,
			tokenCount,
			user,
			userMetadata
		};
	}
);

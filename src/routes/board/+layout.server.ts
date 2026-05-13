import * as Sentry from '@sentry/sveltekit';
import { BerichtgenError, ECommonServerError } from '$lib/errors';
import db from '$server/db';
import type { LayoutServerLoad } from './$types';
import { loadFlash } from 'sveltekit-flash-message/server';
import { tryResultAsync } from '$lib/result';

export const load: LayoutServerLoad = loadFlash(
	async ({ locals: { user, session }, depends }) => {
		depends('user:tokenCount');

		if (!user) {
			return {
				tokenCount: null,
				session
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
			const insertedResult = await tryResultAsync(
				db
					.insertInto('user_token_count')
					.values({ user_id: user.id, tokens: 0 })
					.onConflict((oc) => oc.column('user_id').doNothing())
					.returning('tokens')
					.executeTakeFirst(),
				BerichtgenError,
				ECommonServerError.DATABASE_ERROR
			);
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
			tokenCount,
			session,
			user,
			userMetadata
		};
	}
);

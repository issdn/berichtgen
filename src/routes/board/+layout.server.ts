import * as Sentry from '@sentry/sveltekit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: LayoutServerLoad = async ({
	locals: { user, session },
	depends
}) => {
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
		try {
			const inserted = await db
				.insertInto('user_token_count')
				.values({ user_id: user.id, tokens: 0 })
				.onConflict((oc) => oc.column('user_id').doNothing())
				.returning('tokens')
				.executeTakeFirst();
			tokenCount = inserted?.tokens ?? 0;
		} catch (e) {
			Sentry.captureException(e);
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
};

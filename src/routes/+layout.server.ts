import db from '$server/db';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({
	cookies,
	locals: { safeGetSession }
}) => {
	const { session, user } = await safeGetSession();

	const profile = user
		? ((await db
				.selectFrom('profile')
				.selectAll()
				.where('id', '=', user.id)
				.executeTakeFirst()) ?? null)
		: null;

	return {
		cookies: cookies.getAll(),
		profile,
		session,
		user
	};
};

import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: LayoutServerLoad = async ({
	locals: { safeGetSession },
	cookies
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
		session,
		user,
		profile,
		cookies: cookies.getAll()
	};
};

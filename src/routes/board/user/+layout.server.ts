import { redirect } from '@sveltejs/kit';

export const load = async ({ locals: { safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		redirect(302, '/board');
	}
};

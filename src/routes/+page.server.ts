import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	const session = await locals.auth();

	if (session !== null) redirect(303, '/board');

	return {
		session
	};
};

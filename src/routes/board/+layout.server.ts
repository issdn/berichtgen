import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const session = await locals.auth();

	if (session === null) {
		redirect(307, '/');
	}

	return {
		session
	};
};

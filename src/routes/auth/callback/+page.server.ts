import { throwSvelteError } from '$lib/errors.js';
import { EAuthError } from '$lib/modules/auth/errors';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals: { supabase }, url }) => {
	const code = url.searchParams.get('code') as string;
	const next = url.searchParams.get('next') ?? '/';
	if (code) {
		const { error: e } = await supabase.auth.exchangeCodeForSession(code);

		if (!e) {
			throw redirect(303, `/${next.slice(1)}`);
		}
		throwSvelteError({
			...EAuthError.OAUTH_LOGIN_FAILED,
			message: `OAuth-Login Fehler mit code: ${e?.code ?? 'unbekannt'}`
		});
	}
	throwSvelteError(EAuthError.NO_CODE);
};

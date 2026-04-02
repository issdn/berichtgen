import { throwSvelteError } from '$lib/errors.js';
import { EAuthError } from '$lib/modules/auth/errors';
import { redirect } from 'sveltekit-flash-message/server';

export const load = async ({ locals: { supabase }, url, cookies }) => {
	const code = url.searchParams.get('code') as string;
	const next = url.searchParams.get('next') ?? '/';

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);

		if (!error) {
			throw redirect(
				303,
				`/${next.slice(1)}`,
				{ type: 'success', message: 'Erfolgreich angemeldet!' },
				cookies
			);
		}

		throwSvelteError({
			...EAuthError.OAUTH_LOGIN_FAILED,
			message: `OAuth-Login Fehler mit code: ${error?.code ?? 'unbekannt'}`
		});
	}

	throwSvelteError(EAuthError.NO_CODE);
};

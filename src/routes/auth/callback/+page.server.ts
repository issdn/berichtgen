import { EAuthError } from '$core/auth/errors';
import { svelteApiError } from '$server/errors';
import { redirect } from 'sveltekit-flash-message/server';

export const load = async ({ cookies, locals: { supabase }, url }) => {
	const code = url.searchParams.get('code') as string;
	const next = url.searchParams.get('next') ?? '/';

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);

		if (!error) {
			throw redirect(
				303,
				`/${next.slice(1)}`,
				{ message: 'Erfolgreich angemeldet!', type: 'success' },
				cookies
			);
		}

		throw svelteApiError({
			...EAuthError.OAUTH_LOGIN_FAILED,
			message: `OAuth-Login Fehler mit code: ${error?.code ?? 'unbekannt'}`
		});
	}

	throw svelteApiError(EAuthError.NO_CODE);
};

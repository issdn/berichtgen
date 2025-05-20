import { error, redirect } from '@sveltejs/kit';

export const load = async ({ locals: { supabase }, url }) => {
	const code = url.searchParams.get('code') as string;
	const next = url.searchParams.get('next') ?? '/';
	if (code) {
		const { error: e } = await supabase.auth.exchangeCodeForSession(code);

		if (!e) {
			throw redirect(303, `/${next.slice(1)}`);
		}
		throw error(503, `OAuth-Login Fehler mit code: ${e?.code ?? 'unbekannt'}`);
	}
	throw error(503, 'Unbekannter Fehler: kein Code erhalten');
};

import { redirect } from 'sveltekit-flash-message/server';
import { throwSvelteError, ECommonServerError } from '$lib/errors.js';

export const load = async ({ url, cookies }) => {
	const status = url.searchParams.get('redirect_status');

	if (status === 'succeeded') {
		throw redirect(
			303,
			'/board',
			{
				type: 'success',
				message: 'Zahlung wird verarbeitet.',
				data: {
					closeButton: true,
					duration: 10_000,
					description:
						'Du erhältst deine Tokens sobald die Zahlung bestätigt wurde - lade die Seite dann neu.'
				}
			},
			cookies
		);
	}

	if (status === 'failed') {
		throw redirect(
			303,
			'/board/user/kauf',
			{
				type: 'error',
				message: 'Zahlung fehlgeschlagen. Bitte versuche es erneut.'
			},
			cookies
		);
	}

	throwSvelteError(ECommonServerError.INTERNAL_ERROR);
};

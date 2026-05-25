import { ECommonServerError } from '$lib/errors.js';
import { svelteApiError } from '$server/errors';
import { redirect } from 'sveltekit-flash-message/server';

export const load = async ({ cookies, url }) => {
	const status = url.searchParams.get('redirect_status');

	if (status === 'succeeded') {
		throw redirect(
			303,
			'/board',
			{
				data: {
					closeButton: true,
					description:
						'Du erhältst deine Tokens sobald die Zahlung bestätigt wurde - lade die Seite dann neu.',
					duration: 10_000
				},
				message: 'Zahlung wird verarbeitet.',
				type: 'success'
			},
			cookies
		);
	}

	if (status === 'failed') {
		throw redirect(
			303,
			'/board/user/kauf',
			{
				message: 'Zahlung fehlgeschlagen. Bitte versuche es erneut.',
				type: 'error'
			},
			cookies
		);
	}

	throw svelteApiError(ECommonServerError.INTERNAL_ERROR);
};

import { appendConsentLog } from '$core/auth/api/consent.handlers';
import { EAuthError } from '$core/auth/errors';
import {
	PRIVACY_CONSENT_GRANTED_METADATA_KEY,
	PRIVACY_CONSENT_VERSION_METADATA_KEY,
	PRIVACY_POLICY_CONSENT_SOURCE_LOGIN_GATE,
	PRIVACY_POLICY_CONSENT_TYPE
} from '$lib/constants';
import { svelteApiError } from '$server/errors';
import { redirect } from 'sveltekit-flash-message/server';

export const load = async ({ cookies, locals: { supabase }, url }) => {
	const code = url.searchParams.get('code') as string;
	const next = url.searchParams.get('next') ?? '/';
	const consentGranted =
		url.searchParams.get(PRIVACY_CONSENT_GRANTED_METADATA_KEY) === 'true';
	const privacyConsentVersion = url.searchParams.get(
		PRIVACY_CONSENT_VERSION_METADATA_KEY
	);

	if (code) {
		const { data, error } = await supabase.auth.exchangeCodeForSession(code);

		if (!error) {
			if (!consentGranted || !privacyConsentVersion) {
				throw svelteApiError({
					...EAuthError.OAUTH_LOGIN_FAILED,
					cause:
						'Datenschutzeinwilligung oder Datenschutzversionsstand fehlt im OAuth-Login.'
				});
			}
			if (!data.user?.email) {
				throw svelteApiError({
					...EAuthError.OAUTH_LOGIN_FAILED,
					cause:
						'Die Datenschutz-Einwilligung konnte nicht gespeichert werden, weil keine E-Mail-Adresse vorhanden ist.'
				});
			}

			const consentResult = await appendConsentLog({
				appVersion: privacyConsentVersion,
				consentType: PRIVACY_POLICY_CONSENT_TYPE,
				source: PRIVACY_POLICY_CONSENT_SOURCE_LOGIN_GATE,
				status: 'granted',
				userEmail: data.user.email,
				userId: data.user?.id ?? null
			});
			if (!consentResult.ok) {
				throw svelteApiError(consentResult.error.apiError);
			}

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

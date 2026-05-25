import { buildError } from '$lib/errors';

export const EAuthError = buildError('core.auth', {
	NO_CODE: { httpCode: 500, message: 'Kein Code erhalten.' },
	OAUTH_LOGIN_FAILED: { httpCode: 503, message: 'OAuth-Login Fehler.' }
} as const);

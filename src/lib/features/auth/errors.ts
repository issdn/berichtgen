import { ***REMOVED***Error, buildError } from '$lib/errors';

export const EAuthError = buildError({
	NO_CODE: { httpCode: 500, message: 'Kein Code erhalten.' },
	OAUTH_LOGIN_FAILED: { httpCode: 503, message: 'OAuth-Login Fehler.' }
} as const);

type AuthErrorValue = (typeof EAuthError)[keyof typeof EAuthError];

export class AuthError extends ***REMOVED***Error {
	declare readonly apiError: AuthErrorValue;

	constructor(apiError: AuthErrorValue) {
		super(apiError);
	}

	static fromCode(code: string): AuthError {
		const match = (Object.values(EAuthError) as AuthErrorValue[]).find((e) => e.code === code);
		return new AuthError(match ?? EAuthError.OAUTH_LOGIN_FAILED);
	}
}

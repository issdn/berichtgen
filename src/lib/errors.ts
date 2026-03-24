import { ZodError } from 'zod';
import { error } from '@sveltejs/kit';

type OmitErrorField<T extends EnumError, F extends keyof T[keyof T]> = {
	[K in keyof T]: Omit<T[K], F>;
};

type EnumError = {
	[key: string]: {
		code: string;
		httpCode: number;
		message: string;
		cause?: string | null;
	};
};

export function throwSvelteError(
	e: APIError[keyof APIError],
	cause?: string | null
) {
	cause ??= e.cause;

	return error(e.httpCode, {
		message: e.message,
		code: e.code,
		cause
	});
}

export type ErrorBody<T extends EnumError> = T[keyof T];

function buildError<T extends OmitErrorField<EnumError, 'code'>>(error: T) {
	return Object.freeze(
		Object.fromEntries(
			Object.entries(error).map(([key, val]) => [key, { ...val, code: key }])
		)
	);
}

export function errorByHttpCode<T extends EnumError>(
	error: T,
	httpCode: number
): T[keyof T] | null {
	const entry = Object.entries(error).find(
		([_, val]) => val.httpCode === httpCode
	);
	return entry ? (entry[1] as T[keyof T]) : null;
}

export type APIError = typeof ECommonServerError &
	typeof ECompletionException &
	typeof E***REMOVED***Error &
	typeof EGenAIError &
	typeof ETemplateReportError &
	typeof OAuthError;

export class ***REMOVED***Error extends Error {
	public type: keyof typeof E***REMOVED***Error;

	constructor(type: keyof typeof E***REMOVED***Error, message: string) {
		super(message);
		this.type = type;
	}

	static fromUnknown(
		e: unknown,
		message: string,
		type: keyof typeof E***REMOVED***Error = 'DEVELOPERS_FAULT'
	) {
		if (e instanceof ZodError) {
			return new ***REMOVED***Error(type, e.message);
		} else if (e instanceof Error) {
			return new ***REMOVED***Error(type, e.message);
		}
		return new ***REMOVED***Error(type, message);
	}
}

export const ECommonServerError = buildError({
	DATABASE_ERROR: { httpCode: 500, message: 'Datenbankfehler.' },
	UNAUTHORIZED: {
		httpCode: 401,
		message: 'Nicht autorisiert.',
		cause: 'Muss angemeldet sein, um diese Aktion durchzuführen.'
	},
	VALIDATION_ERROR: { httpCode: 400, message: 'Validierungsfehler.' },
	STRIPE_ERROR: { httpCode: 500, message: 'Stripe-Fehler.' },
	INTERNAL_ERROR: { httpCode: 500, message: 'Interner Serverfehler.' }
} as const);

export const E***REMOVED***Error = buildError({
	INVALID_FILE: { httpCode: 400, message: 'Ungültige Datei.' },
	FORMAT_NOT_SUPPORTED: { httpCode: 400, message: 'Format nicht unterstützt.' },
	COMPLETION_FAILED: {
		httpCode: 500,
		message: 'Vervollständigung fehlgeschlagen.'
	},
	PARSE_FAILED: { httpCode: 400, message: 'Parsing fehlgeschlagen.' },
	SPREAD_FAILED: { httpCode: 500, message: 'Zeitverteilung fehlgeschlagen.' },
	DEVELOPERS_FAULT: { httpCode: 500, message: 'Fehler des Entwicklers.' },
	DOCX_FAULTY: { httpCode: 400, message: 'DOCX-Datei fehlerhaft.' },
	INVALID_JSON_FROM_AI: {
		httpCode: 500,
		message: 'Ungültige JSON-Antwort von der KI.'
	},
	STRIPE_ERROR: { httpCode: 500, message: 'Stripe-Fehler.' }
} as const);

export const EOpenAIError = buildError({
	BAD_REQUEST: { httpCode: 400, message: 'Ungültige Anfrage.' },
	AUTHENTICATION: { httpCode: 401, message: 'Authentifizierungsfehler.' },
	PERMISSION_DENIED: { httpCode: 403, message: 'Zugriff verweigert.' },
	NOT_FOUND: { httpCode: 404, message: 'Nicht gefunden.' },
	UNPROCESSABLE_ENTITY: { httpCode: 422, message: 'Unverarbeitbare Entität.' },
	RATE_LIMIT: { httpCode: 429, message: 'Zu viele Anfragen.' },
	INTERNAL: { httpCode: 500, message: 'Interner Serverfehler.' }
} as const);

export const EGenAIError = buildError({
	// The request body is malformed. There is a typo, or a missing required field in your request.
	INVALID_ARGUMENT: { httpCode: 400, message: 'Ungültiges Argument.' },

	// Your API key doesn't have the required permissions.
	PERMISSION_DENIED: { httpCode: 403, message: 'Zugriff verweigert.' },

	// The requested resource wasn't found.
	NOT_FOUND: { httpCode: 404, message: 'Nicht gefunden.' },

	// You've exceeded the rate limit.
	RESOURCE_EXHAUSTED: { httpCode: 429, message: 'Ratenlimit überschritten.' },

	// An unexpected error occurred on Google's side.
	INTERNAL: { httpCode: 500, message: 'Interner Serverfehler.' },

	// The service may be temporarily overloaded or down.
	UNAVAILABLE: { httpCode: 503, message: 'Dienst nicht verfügbar.' },

	// The service is unable to finish processing within the deadline.
	DEADLINE_EXCEEDED: { httpCode: 504, message: 'Zeitlimit überschritten.' }
} as const);

export const ETemplateReportError = buildError({
	TEMPLATE_NOT_FOUND: { httpCode: 404, message: 'Template nicht gefunden.' },
	ALREADY_REPORTED: {
		httpCode: 409,
		message: 'Du hast dieses Template bereits gemeldet.'
	},
	CANNOT_REPORT_OWN: {
		httpCode: 403,
		message: 'Du kannst dein eigenes Template nicht melden.'
	},
	TEMPLATE_SAFE: {
		httpCode: 403,
		message: 'Dieses Template wurde als sicher markiert.'
	}
} as const);

export const ECompletionException = buildError({
	NOT_ENOUGH_TOKENS: { httpCode: 402, message: 'Nicht genug Tokens.' },
	UNKNOWN_THIRD_PARTY_ERROR: {
		httpCode: 404,
		message: 'Ein unbekannter Fehler beim LLM-Anbieter ist aufgetreten.'
	},
	TOO_MANY_REQUESTS: { httpCode: 429, message: 'Zu viele Anfragen.' },
	INTERNAL: { httpCode: 500, message: 'Interner Serverfehler.' }
} as const);

/**
 * Normalises an unknown thrown value into a structured error body.
 *
 * Handles three cases in priority order:
 * 1. SvelteKit `HttpError` produced by {@link throwSvelteError} — extracts `code`, `message` and
 *    `cause` from the `.body` property.
 * 2. Native `Error` instance — uses `.message` and falls back to `'INTERNAL_ERROR'` as the code.
 * 3. Anything else — returns a generic German fallback message.
 *
 * @param e - The unknown value caught in a `catch` block.
 * @returns A structured error body without the HTTP status code.
 */
export function toErrorBody(e: unknown): Omit<ErrorBody<APIError>, 'httpCode'> {
	if (e !== null && typeof e === 'object') {
		// SvelteKit HttpError thrown via throwSvelteError — body has { message, code, cause }
		if ('body' in e && e.body !== null && typeof e.body === 'object') {
			const body = e.body as Record<string, unknown>;
			if (typeof body.code === 'string' && typeof body.message === 'string') {
				return {
					code: body.code,
					message: body.message,
					cause: typeof body.cause === 'string' ? body.cause : null
				};
			}
		}
		if (e instanceof Error) {
			return {
				code: 'INTERNAL_ERROR',
				message: e.message,
				cause: null
			};
		}
	}
	return {
		code: 'INTERNAL_ERROR',
		message: 'Ein unbekannter Fehler ist aufgetreten.',
		cause: null
	};
}

export const OAuthError = buildError({
	NO_CODE: { httpCode: 500, message: 'Kein Code erhalten.' },
	OAUTH_LOGIN_FAILED: { httpCode: 503, message: 'OAuth-Login Fehler.' }
} as const);

// function openAIErrorCodeToCompletionExceptionType(
// 	code: number
// ): keyof typeof CompletionExceptionType {
// 	switch (code) {
// 		case EOpenAIError.BAD_REQUEST.code:
// 			return 'INVALID_TOKEN';
// 		case EOpenAIError.PERMISSION_DENIED.code:
// 			return 'INVALID_TOKEN';
// 		case EOpenAIError.RATE_LIMIT.code:
// 			return 'TOO_MANY_REQUESTS';
// 		default:
// 			return 'UNKNOWN_THIRD_PARTY_ERROR';
// 	}
// }

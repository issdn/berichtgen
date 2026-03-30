import { error } from '@sveltejs/kit';

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

type OmitErrorField<T extends EnumError, F extends keyof T[keyof T]> = {
	[K in keyof T]: Omit<T[K], F>;
};

type EnumError = {
	[key: string]: {
		code: string;
		httpCode: number;
		message: string;
		cause?: string;
	};
};

/** Structural type satisfied by every value produced by {@link buildError}. */
export type AnyErrorValue = {
	readonly code: string;
	readonly httpCode: number;
	readonly message: string;
	readonly cause?: string;
};

export type ErrorBody<T extends EnumError> = T[keyof T];

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildError<T extends OmitErrorField<EnumError, 'code'>>(error: T) {
	return Object.freeze(
		Object.fromEntries(
			Object.entries(error).map(([key, val]) => [key, { ...val, code: key }])
		)
	) as { readonly [K in keyof T]: T[K] & { readonly code: K } };
}

// ---------------------------------------------------------------------------
// Common (cross-cutting) errors — used across routes and modules
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Base error class
// ---------------------------------------------------------------------------

export class ***REMOVED***Error extends Error {
	constructor(public readonly apiError: AnyErrorValue) {
		super(apiError.message);
	}

	static fromCode(code: string): ***REMOVED***Error {
		const match = (Object.values(ECommonServerError) as AnyErrorValue[]).find(
			(e) => e.code === code
		);
		return new ***REMOVED***Error(match ?? ECommonServerError.INTERNAL_ERROR);
	}
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function throwSvelteError(e: AnyErrorValue, cause?: string) {
	return error(e.httpCode, {
		message: e.message,
		code: e.code,
		cause
	});
}

export function errorByHttpCode<T extends EnumError>(
	error: T,
	httpCode: number
): T[keyof T] | null {
	const entry = Object.entries(error).find(([_, val]) => val.httpCode === httpCode);
	return entry ? (entry[1] as T[keyof T]) : null;
}

/**
 * Normalises an unknown thrown value into a structured error body.
 *
 * Handles three cases in priority order:
 * 1. SvelteKit `HttpError` produced by {@link throwSvelteError} — extracts `code`, `message` and
 *    `cause` from the `.body` property.
 * 2. Native `Error` instance — uses `.message` and falls back to `'INTERNAL_ERROR'` as the code.
 * 3. Anything else — returns a generic German fallback message.
 */
export function toErrorBody(e: unknown): Omit<AnyErrorValue, 'httpCode'> {
	if (e !== null && typeof e === 'object') {
		if ('body' in e && e.body !== null && typeof e.body === 'object') {
			const body = e.body as Record<string, unknown>;
			if (typeof body.code === 'string' && typeof body.message === 'string') {
				return {
					code: body.code,
					message: body.message,
					cause: typeof body.cause === 'string' ? body.cause : undefined
				};
			}
		}
		if (e instanceof Error) {
			return {
				code: 'INTERNAL_ERROR',
				message: e.message,
				cause: undefined
			};
		}
	}
	return {
		code: 'INTERNAL_ERROR',
		message: 'Ein unbekannter Fehler ist aufgetreten.',
		cause: undefined
	};
}

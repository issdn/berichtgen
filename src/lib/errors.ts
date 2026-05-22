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

/**
 * Derives the union of all error value types from a tuple of error enums
 * produced by {@link buildError}.
 *
 * @example
 * type MyErrors = UnionOf<[typeof EFooError, typeof EBarError]>;
 */
export type UnionOf<T extends readonly Record<string, AnyErrorValue>[]> = {
	[K in keyof T]: T[K][keyof T[K]];
}[number];

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildError<T extends OmitErrorField<EnumError, 'code'>>(
	error: T
) {
	return Object.freeze(
		Object.fromEntries(
			Object.entries(error).map(([key, val]) => [key, { ...val, code: key }])
		)
	) as {
		readonly [K in keyof T]: Omit<T[K], 'cause'> & {
			readonly code: K & string;
			readonly cause?: string;
		};
	};
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

export class BerichtgenError extends Error {
	constructor(public readonly apiError: AnyErrorValue) {
		super(apiError.message);
	}

	static fromCode(code: string): BerichtgenError {
		const match = (Object.values(ECommonServerError) as AnyErrorValue[]).find(
			(e) => e.code === code
		);
		return new BerichtgenError(match ?? ECommonServerError.INTERNAL_ERROR);
	}
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function svelteApiError(e: AnyErrorValue, cause?: string) {
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
	const entry = Object.entries(error).find(
		([_, val]) => val.httpCode === httpCode
	);
	return entry ? (entry[1] as T[keyof T]) : null;
}

/**
 * Normalises an unknown thrown value into a structured error body.
 *
 * Handles three cases in priority order:
 * 1. SvelteKit `HttpError` produced by {@link throw svelteApiError} — extracts `code`, `message` and
 *    `cause` from the `.body` property.
 * 2. Native `Error` instance — uses `.message` and falls back to `'INTERNAL_ERROR'` as the code.
 * 3. Anything else — returns a generic German fallback message.
 */
/** Extracts a structured error body from a plain object, or returns null. */
function parseRecord(obj: unknown): Omit<AnyErrorValue, 'httpCode'> | null {
	if (obj === null || typeof obj !== 'object') return null;
	const { code, message, cause } = obj as Record<string, unknown>;
	if (typeof code !== 'string' || typeof message !== 'string') return null;
	return {
		code,
		message,
		cause: typeof cause === 'string' ? cause : undefined
	};
}

export function toErrorBody(e: unknown): Omit<AnyErrorValue, 'httpCode'> {
	if (e !== null && typeof e === 'object') {
		// 1. SvelteKit HttpError: { body: { code, message, cause? } }
		if ('body' in e)
			return parseRecord(e.body) ?? parseRecord(e) ?? fallback(e);
		// 2. Flat structured object or native Error
		return parseRecord(e) ?? fallback(e);
	}
	return fallback(e);
}

function fallback(e: unknown): Omit<AnyErrorValue, 'httpCode'> {
	return {
		code: 'INTERNAL_ERROR',
		message:
			e instanceof Error
				? e.message
				: 'Ein unbekannter Fehler ist aufgetreten.',
		cause: undefined
	};
}

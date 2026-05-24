import { error } from '@sveltejs/kit';

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/** Structural type satisfied by every value produced by {@link buildError}. */
export type AnyErrorValue = {
	readonly cause?: string;
	readonly code: string;
	readonly httpCode: number;
	readonly message: string;
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

type EnumError = {
	[key: string]: {
		cause?: string;
		code: string;
		httpCode: number;
		message: string;
	};
};

type OmitErrorField<T extends EnumError, F extends keyof T[keyof T]> = {
	[K in keyof T]: Omit<T[K], F>;
};

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
			readonly cause?: string;
			readonly code: K & string;
		};
	};
}

// ---------------------------------------------------------------------------
// Common (cross-cutting) errors — used across routes and modules
// ---------------------------------------------------------------------------

export const ECommonServerError = buildError({
	DATABASE_ERROR: { httpCode: 500, message: 'Datenbankfehler.' },
	INTERNAL_ERROR: { httpCode: 500, message: 'Interner Serverfehler.' },
	STRIPE_ERROR: { httpCode: 500, message: 'Stripe-Fehler.' },
	UNAUTHORIZED: {
		cause: 'Muss angemeldet sein, um diese Aktion durchzuführen.',
		httpCode: 401,
		message: 'Nicht autorisiert.'
	},
	VALIDATION_ERROR: { httpCode: 400, message: 'Validierungsfehler.' }
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

export function errorByHttpCode<T extends EnumError>(
	error: T,
	httpCode: number
): null | T[keyof T] {
	const entry = Object.entries(error).find(
		([_, val]) => val.httpCode === httpCode
	);
	return entry ? (entry[1] as T[keyof T]) : null;
}

export function svelteApiError(e: AnyErrorValue, cause?: string) {
	return error(e.httpCode, {
		cause,
		code: e.code,
		message: e.message
	});
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
		cause: undefined,
		code: 'INTERNAL_ERROR',
		message:
			e instanceof Error
				? e.message
				: 'Ein unbekannter Fehler ist aufgetreten.'
	};
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
function parseRecord(obj: unknown): null | Omit<AnyErrorValue, 'httpCode'> {
	if (obj === null || typeof obj !== 'object') return null;
	const { cause, code, message } = obj as Record<string, unknown>;
	if (typeof code !== 'string' || typeof message !== 'string') return null;
	return {
		cause: typeof cause === 'string' ? cause : undefined,
		code,
		message
	};
}

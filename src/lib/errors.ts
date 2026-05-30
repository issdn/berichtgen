export const errorRegistry = new Map<string, Record<string, AnyErrorValue>>();

export const ECommonServerError = buildError('core.server', {
	DATABASE_ERROR: { httpCode: 500, message: 'Datenbankfehler.' },
	INTERNAL_ERROR: { httpCode: 500, message: 'Interner Serverfehler.' },
	STRIPE_ERROR: { httpCode: 500, message: 'Stripe-Fehler.' },
	UNAUTHORIZED: {
		cause: 'Muss angemeldet sein, um diese Aktion durchzuführen.',
		httpCode: 401,
		message: 'Nicht autorisiert.'
	},
	UNKNOWN_ERROR: {
		httpCode: 500,
		message: 'Ein unbekannter Fehler ist aufgetreten.'
	},
	VALIDATION_ERROR: { httpCode: 400, message: 'Validierungsfehler.' }
} as const);

export const EBaseErrors = buildError('core.base', {
	UNKNOWN_ERROR: {
		httpCode: 500,
		message: 'Ein unbekannter Fehler ist aufgetreten.'
	}
} as const);

/** Structural type satisfied by every value produced by {@link buildError}. */
export type AnyErrorValue = {
	readonly cause?: string;
	readonly code: string;
	readonly feature: string;
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

export class BerichtgenError extends Error {
	constructor(public readonly apiError: AnyErrorValue) {
		super(apiError.message);
	}

	static fromCode(feature: string, code: string): BerichtgenError {
		const match = errorRegistry.get(feature)?.[code];

		return new BerichtgenError(match ?? EBaseErrors.UNKNOWN_ERROR);
	}
}

// ---------------------------------------------------------------------------
// Base error class
// ---------------------------------------------------------------------------

export function buildError<T extends OmitErrorField<EnumError, 'code'>>(
	feature: string,
	error: T
) {
	const built = Object.freeze(
		Object.fromEntries(
			Object.entries(error).map(([key, val]) => [
				key,
				{ ...val, code: key, feature }
			])
		)
	) as {
		readonly [K in keyof T]: Omit<T[K], 'cause'> & {
			readonly cause?: string;
			readonly code: K & string;
			readonly feature: string;
		};
	};

	errorRegistry.set(feature, built as Record<string, AnyErrorValue>);
	return built;
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

export function toErrorBody(e: unknown): Omit<AnyErrorValue, 'httpCode'> {
	if (e instanceof BerichtgenError) return e.apiError;

	if (e instanceof Error) {
		return {
			...EBaseErrors.UNKNOWN_ERROR,
			cause: e.message
		};
	}

	if (e !== null && typeof e === 'object') {
		// 1. SvelteKit HttpError: { body: { code, message, cause? } }
		if ('body' in e)
			return parseRecord(e.body) ?? parseRecord(e) ?? EBaseErrors.UNKNOWN_ERROR;
		// 2. Flat structured object or native Error
		return parseRecord(e) ?? EBaseErrors.UNKNOWN_ERROR;
	}
	return EBaseErrors.UNKNOWN_ERROR;
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
		feature:
			typeof (obj as { feature?: unknown }).feature === 'string'
				? (obj as { feature: string }).feature
				: 'core.server',
		message
	};
}

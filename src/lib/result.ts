import { ***REMOVED***Error, toErrorBody, type AnyErrorValue } from '$lib/errors';

export type Result<T> =
	| { ok: true; data: T }
	| { ok: false; error: ***REMOVED***Error };

export function okResult<T>(data: T): Result<T> {
	return { ok: true, data };
}

export function errResult(
	errorClass: typeof ***REMOVED***Error,
	apiError: AnyErrorValue,
	error?: unknown
): Result<never> {
	return {
		ok: false,
		error:
			error instanceof ***REMOVED***Error
				? error
				: new errorClass({ ...apiError, cause: toErrorBody(error).message })
	};
}

/**
 * Runs an async operation inside a try/catch and returns a Result<T>.
 * If the thrown value is already a ***REMOVED***Error, wraps it directly.
 * Otherwise calls mapError to convert the unknown error.
 */
export async function tryResult<T>(
	promise: Promise<T>,
	errorClass: typeof ***REMOVED***Error,
	apiError: AnyErrorValue
): Promise<Result<T>> {
	try {
		return okResult(await promise);
	} catch (e) {
		return errResult(errorClass, apiError, e);
	}
}

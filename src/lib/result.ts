import { BerichtgenError, toErrorBody, type AnyErrorValue } from '$lib/errors';

export type Result<T> =
	| { ok: true; data: T }
	| { ok: false; error: BerichtgenError };

export function okResult<T>(data: T): Result<T> {
	return { ok: true, data };
}

export function errResult(
	errorClass: typeof BerichtgenError,
	apiError: AnyErrorValue,
	error?: unknown
): Result<never> {
	return {
		ok: false,
		error:
			error instanceof BerichtgenError
				? error
				: new errorClass({ ...apiError, cause: toErrorBody(error).message })
	};
}

/**
 * Runs an async operation inside a try/catch and returns a Result<T>.
 * If the thrown value is already a BerichtgenError, wraps it directly.
 * Otherwise calls mapError to convert the unknown error.
 */
export async function tryResult<T>(
	promise: Promise<T>,
	errorClass: typeof BerichtgenError,
	apiError: AnyErrorValue
): Promise<Result<T>> {
	try {
		return okResult(await promise);
	} catch (e) {
		return errResult(errorClass, apiError, e);
	}
}

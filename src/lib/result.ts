import { ***REMOVED***Error } from '$lib/errors';

export type Result<T> =
	| { ok: true; data: T }
	| { ok: false; error: ***REMOVED***Error };

export function okResult<T>(data: T): Result<T> {
	return { ok: true, data };
}

export function errResult(error: ***REMOVED***Error): Result<never> {
	return { ok: false, error };
}

/**
 * Runs an async operation inside a try/catch and returns a Result<T>.
 * If the thrown value is already a ***REMOVED***Error, wraps it directly.
 * Otherwise calls mapError to convert the unknown error.
 */
export async function tryResult<T>(
	promise: Promise<T>,
	mapError: (e: unknown) => ***REMOVED***Error
): Promise<Result<T>> {
	try {
		return okResult(await promise);
	} catch (e) {
		return errResult(e instanceof ***REMOVED***Error ? e : mapError(e));
	}
}

import { type AnyErrorValue, BerichtgenError, toErrorBody } from '$lib/errors';

export type Result<T> =
	| { data: T; ok: true; }
	| { error: BerichtgenError; ok: false; };

export function errResult(
	errorClass: typeof BerichtgenError,
	apiError: AnyErrorValue,
	error?: unknown
): Result<never> {
	return {
		error:
			error instanceof BerichtgenError
				? error
				: new errorClass({ ...apiError, ...toErrorBody(error) }),
		ok: false
	};
}

export function okResult<T>(data: T): Result<T> {
	return { data, ok: true };
}

export function tryResult<T>(
	run: () => T,
	errorClass: typeof BerichtgenError,
	apiError: AnyErrorValue
): Result<T> {
	try {
		return okResult(run());
	} catch (e) {
		return errResult(errorClass, apiError, e);
	}
}

export async function tryResultAsync<T>(
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

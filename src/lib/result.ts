import { type AnyErrorValue, BerichtgenError, toErrorBody } from '$lib/errors';

export type Result<T> =
	| { data: T; ok: true }
	| { error: BerichtgenError; ok: false };

export function errResult(
	apiError: AnyErrorValue,
	error?: unknown
): Result<never> {
	return {
		error:
			error instanceof BerichtgenError
				? error
				: new BerichtgenError({ ...apiError, ...toErrorBody(error) }),
		ok: false
	};
}

export function okResult<T>(data: T): Result<T> {
	return { data, ok: true };
}

export function tryResult<T>({
	apiError,
	run
}: {
	apiError: AnyErrorValue;
	run: () => T;
}): Result<T>;
export function tryResult<T>({
	convertError,
	run
}: {
	convertError: (e: unknown) => BerichtgenError;
	run: () => T;
}): Result<T>;
export function tryResult<T>({
	apiError,
	convertError,
	run
}: {
	apiError?: AnyErrorValue;
	convertError?: (e: unknown) => BerichtgenError;
	run: () => T;
}): Result<T> {
	try {
		return okResult(run());
	} catch (e) {
		if (convertError) {
			const converted = convertError(e);
			return errResult(converted.apiError, converted);
		}
		return errResult(apiError!, e);
	}
}

export async function tryResultAsync<T>({
	apiError,
	promise
}: {
	apiError: AnyErrorValue;
	promise: Promise<T>;
}): Promise<Result<T>>;
export async function tryResultAsync<T>({
	convertError,
	promise
}: {
	convertError: (e: unknown) => BerichtgenError;
	promise: Promise<T>;
}): Promise<Result<T>>;
export async function tryResultAsync<T>({
	apiError,
	convertError,
	promise
}: {
	apiError?: AnyErrorValue;
	convertError?: (e: unknown) => BerichtgenError;
	promise: Promise<T>;
}): Promise<Result<T>> {
	try {
		return okResult(await promise);
	} catch (e) {
		if (convertError) {
			const converted = convertError(e);
			return errResult(converted.apiError, converted);
		}
		return errResult(apiError!, e);
	}
}

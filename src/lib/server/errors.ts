import { type AnyErrorValue } from '$lib/errors';
import { error } from '@sveltejs/kit';

export function svelteApiError(e: AnyErrorValue) {
	return error(e.httpCode, {
		cause: e.cause,
		code: e.code,
		message: e.message
	});
}

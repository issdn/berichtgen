import { toErrorBody } from '$lib/errors';
import { describe, expect, it } from 'vitest';

describe('toErrorBody', () => {
	describe('SvelteKit HttpError (from throwSvelteError)', () => {
		it('extracts code, message and cause from a structured body', () => {
			const httpError = {
				body: {
					cause: 'connection timeout',
					code: 'DATABASE_ERROR',
					message: 'Datenbankfehler.'
				}
			};
			expect(toErrorBody(httpError)).toEqual({
				cause: 'connection timeout',
				code: 'DATABASE_ERROR',
				feature: 'core.server',
				message: 'Datenbankfehler.'
			});
		});

		it('sets cause to null when body.cause is not a string', () => {
			const httpError = {
				body: {
					cause: undefined,
					code: 'UNAUTHORIZED',
					message: 'Nicht autorisiert.'
				}
			};
			expect(toErrorBody(httpError)).toEqual({
				cause: undefined,
				code: 'UNAUTHORIZED',
				feature: 'core.server',
				message: 'Nicht autorisiert.'
			});
		});

		it('falls through when body is missing code or message', () => {
			const httpError = { body: { message: 'oops' } };
			expect(toErrorBody(httpError)).toEqual({
				code: 'UNKNOWN_ERROR',
				feature: 'core.base',
				httpCode: 500,
				message: 'Ein unbekannter Fehler ist aufgetreten.'
			});
		});
	});

	describe('native Error', () => {
		it('uses the error message and falls back to INTERNAL_ERROR code', () => {
			expect(toErrorBody(new Error('something broke'))).toEqual({
				cause: 'something broke',
				code: 'UNKNOWN_ERROR',
				feature: 'core.base',
				httpCode: 500,
				message: 'Ein unbekannter Fehler ist aufgetreten.'
			});
		});
	});

	describe('unknown values', () => {
		it.each([undefined, undefined, 42, 'string', true])(
			'returns the generic fallback for %s',
			(value) => {
				expect(toErrorBody(value)).toEqual({
					code: 'UNKNOWN_ERROR',
					feature: 'core.base',
					httpCode: 500,
					message: 'Ein unbekannter Fehler ist aufgetreten.'
				});
			}
		);
	});
});

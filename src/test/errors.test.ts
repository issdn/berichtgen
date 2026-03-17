import { describe, expect, it } from 'vitest';
import { toErrorBody } from '$lib/errors';

describe('toErrorBody', () => {
	describe('SvelteKit HttpError (from throwSvelteError)', () => {
		it('extracts code, message and cause from a structured body', () => {
			const httpError = {
				body: { code: 'DATABASE_ERROR', message: 'Datenbankfehler.', cause: 'connection timeout' }
			};
			expect(toErrorBody(httpError)).toEqual({
				code: 'DATABASE_ERROR',
				message: 'Datenbankfehler.',
				cause: 'connection timeout'
			});
		});

		it('sets cause to null when body.cause is not a string', () => {
			const httpError = {
				body: { code: 'UNAUTHORIZED', message: 'Nicht autorisiert.', cause: null }
			};
			expect(toErrorBody(httpError)).toEqual({
				code: 'UNAUTHORIZED',
				message: 'Nicht autorisiert.',
				cause: null
			});
		});

		it('falls through when body is missing code or message', () => {
			const httpError = { body: { message: 'oops' } };
			expect(toErrorBody(httpError)).toEqual({
				code: 'INTERNAL_ERROR',
				message: 'Ein unbekannter Fehler ist aufgetreten.',
				cause: null
			});
		});
	});

	describe('native Error', () => {
		it('uses the error message and falls back to INTERNAL_ERROR code', () => {
			expect(toErrorBody(new Error('something broke'))).toEqual({
				code: 'INTERNAL_ERROR',
				message: 'something broke',
				cause: null
			});
		});
	});

	describe('unknown values', () => {
		it.each([null, undefined, 42, 'string', true])(
			'returns the generic fallback for %s',
			(value) => {
				expect(toErrorBody(value)).toEqual({
					code: 'INTERNAL_ERROR',
					message: 'Ein unbekannter Fehler ist aufgetreten.',
					cause: null
				});
			}
		);
	});
});

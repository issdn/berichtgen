import type { StandardSchemaV1 } from '@standard-schema/spec';
import type z from 'zod';

import { command, getRequestEvent, query } from '$app/server';
import { ECommonServerError, svelteApiError } from '$lib/errors';

export function guardedCommand<S extends z.ZodTypeAny, T>(
	schema: S,
	fn: (input: StandardSchemaV1.InferOutput<S>) => Promise<T>
) {
	return command(schema, async (input) => {
		const {
			locals: { user }
		} = getRequestEvent();

		if (!user) {
			throw svelteApiError(ECommonServerError.UNAUTHORIZED);
		}

		return fn(input);
	});
}

export function guardedQuery<S extends z.ZodTypeAny, T>(
	schema: S,
	fn: (input: StandardSchemaV1.InferOutput<S>) => Promise<T>
) {
	return query(schema, async (input) => {
		const {
			locals: { user }
		} = getRequestEvent();

		if (!user) {
			throw svelteApiError(ECommonServerError.UNAUTHORIZED);
		}

		return fn(input);
	});
}

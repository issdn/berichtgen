import { command, getRequestEvent, query } from '$app/server';
import { ECommonServerError, throwSvelteError } from '$src/lib/errors';
import * as z from 'zod/v4';
import type { StandardSchemaV1 } from '@standard-schema/spec';

export function guardedQuery<S extends z.ZodTypeAny, T>(
	schema: S,
	fn: (input: StandardSchemaV1.InferOutput<S>) => Promise<T>
) {
	return query(schema, async (input) => {
		const {
			locals: { user }
		} = getRequestEvent();

		if (!user) {
			throwSvelteError(ECommonServerError.UNAUTHORIZED);
		}

		return fn(input);
	});
}

export function guardedCommand<S extends z.ZodTypeAny, T>(
	schema: S,
	fn: (input: StandardSchemaV1.InferOutput<S>) => Promise<T>
) {
	return command(schema, async (input) => {
		const {
			locals: { user }
		} = getRequestEvent();

		if (!user) {
			throwSvelteError(ECommonServerError.UNAUTHORIZED);
		}

		return fn(input);
	});
}

import type { StandardSchemaV1 } from '@standard-schema/spec';
import type z from 'zod';

import { command, form, getRequestEvent, query } from '$app/server';
import { ECommonServerError } from '$lib/errors';
import { svelteApiError } from '$server/errors';

function assertAuthenticated() {
	const {
		locals: { user }
	} = getRequestEvent();

	if (!user) {
		throw svelteApiError(ECommonServerError.UNAUTHORIZED);
	}

	return user;
}

export function guardedCommand<S extends z.ZodTypeAny, T>(
	schema: S,
	fn: (input: StandardSchemaV1.InferOutput<S>) => Promise<T>
) {
	return command(schema, async (input) => {
		assertAuthenticated();
		return fn(input);
	});
}

export function guardedQuery<S extends z.ZodTypeAny, T>(
	schema: S,
	fn: (input: StandardSchemaV1.InferOutput<S>) => Promise<T>
) {
	return query(schema, async (input) => {
		assertAuthenticated();
		return fn(input);
	});
}

export function guardedForm<T>(fn: () => Promise<T>) {
	return form(async () => {
		assertAuthenticated();
		return fn();
	});
}

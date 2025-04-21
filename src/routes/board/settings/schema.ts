import { z } from 'zod';

export const providerSchema = z.object({
	token: z
		.string()
		.max(256, { message: 'Max 256 Zeichen' })
		.nonempty({ message: 'Token kann nicht leer sein.' })
		.nullable(),
	id: z.string(),
	name: z.string(),
	price: z.string(),
	owner: z.string()
});

export const validProviderSchema = z.object({
	token: z
		.string()
		.max(256, { message: 'Max 256 Zeichen' })
		.nonempty({ message: 'Token kann nicht leer sein.' }),
	id: z.string(),
	name: z.string(),
	price: z.string(),
	owner: z.string()
});

export const providerDeleteSchema = z.object({
	id: z.string().nonempty(),
	name: z.string().optional()
});

export type ProviderSchema = typeof providerSchema;

export type ValidProviderSchema = typeof validProviderSchema;

export type ProviderSchemaType = z.infer<ProviderSchema>;

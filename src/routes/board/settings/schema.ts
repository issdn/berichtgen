import { z } from 'zod';

export const providerSchema = z.object({
	token: z
		.string()
		.max(128, { message: 'Max 128 Zeichen' })
		.min(8)
		.nonempty({ message: 'Token kann nicht leer sein.' })
		.nullable(),
	id: z.string(),
	name: z.string(),
	price: z.number()
});

export const providerDeleteSchema = z.object({
	id: z.string().nonempty(),
	name: z.string().optional()
});

export type ProviderSchema = typeof providerSchema;

export type ProviderSchemaType = z.infer<ProviderSchema>;

export type ProviderDelteSchema = typeof providerDeleteSchema;

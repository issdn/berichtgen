import { z } from 'zod';

export const providerSchema = z.object({
	token: z.string().max(128, { message: 'Max 128 Zeichen' }).nullable(),
	id: z.string(),
	name: z.string(),
	price: z.number()
});

export type ProviderSchema = typeof providerSchema;

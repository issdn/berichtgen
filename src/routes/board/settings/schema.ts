import { z } from 'zod';

export const providersSchema = z.object({
	providers: z
		.object({
			token: z.string().min(16).max(128).nullable(),
			id: z.string(),
			name: z.string(),
			price: z.number()
		})
		.array()
});

export type ProviderSchema = typeof providersSchema;

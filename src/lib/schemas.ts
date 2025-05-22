import { Ort, QualifikationenBetrieb, QualifikationenSchule } from '$src/lib/types';
import * as z from 'zod';

export const completionSchema = z.object({
	lessons: z
		.object({
			qualifikationen: z.enum([...QualifikationenBetrieb, ...QualifikationenSchule]).array(),
			text: z.string()
		})
		.array()
});

export const fullResultSchema = z
	.object({
		qualifikationen: z
			.enum([...QualifikationenBetrieb, ...QualifikationenSchule])
			.array()
			.optional()
			.default([]),
		text: z.string({ message: 'Text muss ein Text enthalten!' }),
		hours: z.number({ message: 'Hours/Stunden muss eine ganze Zahl sein.' }).int().optional(),
		ort: z.nativeEnum(Ort, { message: 'Das Objekt muss einen Ort enthalten!' }).optional(),
		datum: z.string({ message: 'Dass Object muss ein Datum enthalten!' })
	})
	.array();

export type fullResultSchema = z.infer<typeof fullResultSchema>;

// -------------------------------------------------

export const providerSchema = z.object({
	token: z
		.string()
		.max(256, { message: 'Max 256 Zeichen' })
		.nonempty({ message: 'Token kann nicht leer sein.' })
		.nullable(),
	id: z.string(),
	name: z.string(),
	price: z.number(),
	owner: z.string()
});

export const validProviderSchema = z.object({
	token: z
		.string()
		.max(256, { message: 'Max 256 Zeichen' })
		.nonempty({ message: 'Token kann nicht leer sein.' }),
	id: z.string(),
	name: z.string(),
	price: z.number(),
	owner: z.string()
});

export const providerDeleteSchema = z.object({
	id: z.string().nonempty(),
	name: z.string().optional()
});

export type ProviderSchema = typeof providerSchema;

export type ValidProviderSchema = typeof validProviderSchema;

export type ProviderSchemaType = z.infer<ProviderSchema>;

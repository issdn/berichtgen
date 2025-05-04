import { Ort, Qualifikationen } from '$src/lib/types';
import * as z from 'zod';

export const completionSchema = z.object({
	lessons: z
		.object({
			qualifikationen: z.enum(Qualifikationen).array(),
			text: z.string()
		})
		.array()
});

export const fullResultSchema = z
	.object({
		qualifikationen: z.enum(Qualifikationen).array().optional().default([]),
		text: z.string({ message: 'Text muss ein Text enthalten!' }),
		hours: z.number({ message: 'Hours/Stunden muss eine ganze Zahl sein.' }).int().optional(),
		ort: z.nativeEnum(Ort, { message: 'Das Objekt muss einen Ort enthalten!' }).optional(),
		datum: z.string({ message: 'Dass Object muss ein Datum enthalten!' })
	})
	.array();

export type fullResultSchema = z.infer<typeof fullResultSchema>;

import { Ort, QualifikationenBetrieb, QualifikationenSchule } from '$src/lib/types';
import * as z from 'zod';
import type { DateRange } from 'bits-ui';
import { CalendarDate } from '@internationalized/date';

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
	owner: z.string(),
	maxTokens: z.number().int()
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

// ------------------------------------------------

export const dateRangeSchema = z.object({
	ranges: z
		.object({
			id: z.number().int().min(0),
			daterange: z.custom<IncuriaDateRange>(
				({ start, end }) => start !== undefined && end !== undefined,
				{ message: 'Mindestens eine Woche muss gewählt werden.' }
			),
			hours: z
				.number({ message: 'Stunden müssen Zahlen sein.' })
				.int({ message: 'Stunden müssen ganze Zahlen sein.' })
				.optional()
				.nullable()
		})
		.array(),
	location: z.enum([Ort.SCHULE, Ort.BETRIEB, Ort.UNTERWEISUNG, Ort['SCHULE/BETRIEB']])
});

export type DateRangeSchema = z.infer<typeof dateRangeSchema>;

type RemoveUndefined<T> = {
	[K in keyof T]: Exclude<T[K], undefined>;
};

export type IncuriaDateRange = Pick<RemoveUndefined<DateRange>, 'end'> & Pick<DateRange, 'start'>;

export type ValidIncuriaDateRanges = {
	ranges: {
		daterange: IncuriaDateRange;
		hours?: number | null;
	}[];
	location: Ort;
};

// ------------------------------------------------

export const completionApiSchema = z.object({
	text: z.string().nonempty(),
	provider: z.string().nonempty(),
	owner: z.string().nonempty(),
	ort: z.enum([Ort.SCHULE, Ort.BETRIEB])
});

// ------------------------------------------------

export const emailSchema = z.object({
	mail: z.string().email('Bitte eine gültige Email-Adresse eingeben')
});

// ------------------------------------------------

export const csvConfigSchema = z
	.object({
		ort: z.nativeEnum(Ort, {
			message: 'Ort muss ein gültiger Ort sein.'
		}),
		file: z.string().nonempty({ message: 'Dateiname muss angegeben werden.' }),
		ranges: z
			.object({
				daterange: z.object({
					start: z.instanceof(CalendarDate, { message: 'Startdatum muss angegeben werden.' }),
					end: z.instanceof(CalendarDate, { message: 'Enddatum muss angegeben werden.' })
				}),
				hours: z.number().int().min(0).optional()
			})
			.array()
	})
	.array();

import { Ort } from '$src/lib/enums';
import * as z from 'zod/v4';
import type { DateRange } from 'bits-ui';
import { CalendarDate } from '@internationalized/date';
import { QualifikationenBetrieb, QualifikationenSchule } from '$src/lib/constants';

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
		ort: z.enum(Ort, { message: 'Das Objekt muss einen Ort enthalten!' }).optional(),
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
			daterange: z.custom<***REMOVED***DateRange>(
				(data) => {
					if (typeof data !== 'object' || data === null) return false;
					const { start, end } = data as { start: unknown; end: unknown };
					return start !== undefined && end !== undefined;
				},
				{ message: 'Mindestens eine Woche muss gewählt werden.' }
			),
			hours: z
				.number({ message: 'Stunden müssen Zahlen sein.' })
				.int({ message: 'Stunden müssen ganze Zahlen sein.' })
				.optional()
				.nullable()
		})
		.array(),
	ort: z.enum([Ort.SCHULE, Ort.BETRIEB, Ort.UNTERWEISUNG, Ort['SCHULE/BETRIEB']])
});

export type DateRangeSchema = z.infer<typeof dateRangeSchema>;

type RemoveUndefined<T> = {
	[K in keyof T]: Exclude<T[K], undefined>;
};

export type ***REMOVED***DateRange = Pick<RemoveUndefined<DateRange>, 'end'> &
	Pick<DateRange, 'start'>;

export type Valid***REMOVED***DateRanges = {
	ranges: {
		daterange: ***REMOVED***DateRange;
		hours?: number | null;
	}[];
	ort: Ort;
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

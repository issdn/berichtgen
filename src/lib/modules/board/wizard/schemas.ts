import { Ort } from '$wizard/enums';
import { CalendarDate } from '@internationalized/date';
import type { DateRange } from 'bits-ui';
import z from 'zod';

export const completionSchema = z.preprocess(
	(str: string) => JSON.parse(str),
	z.array(z.string())
);

export const fullResultSchema = z
	.object({
		text: z.string({ message: 'Text muss ein Text enthalten!' }),
		stunden: z
			.number({ message: 'Stunden muss eine ganze Zahl sein.' })
			.int()
			.optional(),
		ort: z
			.enum(Ort, { message: 'Das Objekt muss einen Ort enthalten!' })
			.optional(),
		datum: z.string({ message: 'Dass Object muss ein Datum enthalten!' })
	})
	.array();

export type fullResultSchema = z.infer<typeof fullResultSchema>;

// -------------------------------------------------

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
			stunden: z
				.number({ message: 'Stunden müssen Zahlen sein.' })
				.int({ message: 'Stunden müssen ganze Zahlen sein.' })
				.optional()
				.nullable()
		})
		.array(),
	ort: z.enum([
		Ort.SCHULE,
		Ort.BETRIEB,
		Ort.UNTERWEISUNG,
		Ort['SCHULE/BETRIEB']
	])
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
		stunden?: number | null;
	}[];
	ort: Ort;
};

// ------------------------------------------------

export const completionApiSchema = z.object({
	text: z.string().nonempty(),
	ort: z.enum([Ort.SCHULE, Ort.BETRIEB])
});

// ------------------------------------------------

/** One item in a batch completion request. */
export const batchCompletionItemSchema = z.object({
	text: z.string().nonempty(),
	ort: z.enum([Ort.SCHULE, Ort.BETRIEB])
});

/** Schema for the batch completion endpoint request body. */
export const batchCompletionApiSchema = z.object({
	items: z.array(batchCompletionItemSchema).min(1)
});

/**
 * Response from the batch completion endpoint.
 * `results[i]` is `null` when item i was not processed due to an insufficient token budget.
 * `insufficient_tokens` is true when some items were skipped for that reason.
 */
export type BatchCompletionApiResponse = {
	results: (string[] | null)[];
	insufficient_tokens: boolean;
};

export const csvConfigSchema = z
	.object({
		ort: z.enum(Ort, {
			message: 'Ort muss ein gültiger Ort sein.'
		}),
		file: z.string().nonempty({ message: 'Dateiname muss angegeben werden.' }),
		ranges: z
			.object({
				daterange: z.object({
					start: z.instanceof(CalendarDate, {
						message: 'Startdatum muss angegeben werden.'
					}),
					end: z.instanceof(CalendarDate, {
						message: 'Enddatum muss angegeben werden.'
					})
				}),
				stunden: z.number().int().min(0).optional()
			})
			.array()
	})
	.array();

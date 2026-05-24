import type { DateRange } from 'bits-ui';

import { Ort } from '$wizard/enums';
import { CalendarDate } from '@internationalized/date';
import z from 'zod';

export const completionSchema = z.preprocess(
	(str: string) => JSON.parse(str),
	z.array(z.string())
);

export const fullResultSchema = z
	.object({
		datum: z.string({ message: 'Dass Object muss ein Datum enthalten!' }),
		ort: z
			.enum(Ort, { message: 'Das Objekt muss einen Ort enthalten!' })
			.optional(),
		stunden: z
			.number({ message: 'Stunden muss eine ganze Zahl sein.' })
			.int()
			.optional(),
		text: z.string({ message: 'Text muss ein Text enthalten!' })
	})
	.array();

export type fullResultSchema = z.infer<typeof fullResultSchema>;

// -------------------------------------------------

export const dateRangeSchema = z.object({
	ort: z.enum([
		Ort.SCHULE,
		Ort.BETRIEB,
		Ort.UNTERWEISUNG,
		Ort['SCHULE/BETRIEB']
	]),
	ranges: z
		.object({
			daterange: z.custom<BerichtgenDateRange>(
				(data) => {
					if (typeof data !== 'object' || data === null) return false;
					const { end, start } = data as { end: unknown; start: unknown; };
					return start !== undefined && end !== undefined;
				},
				{ message: 'Mindestens eine Woche muss gewählt werden.' }
			),
			id: z.number().int().min(0),
			stunden: z
				.number({ message: 'Stunden müssen Zahlen sein.' })
				.int({ message: 'Stunden müssen ganze Zahlen sein.' })
				.optional()
				.nullable()
		})
		.array()
});

export type BerichtgenDateRange = Pick<DateRange, 'start'> &
	Pick<RemoveUndefined<DateRange>, 'end'>;

export type DateRangeSchema = z.infer<typeof dateRangeSchema>;

export type ValidBerichtgenDateRanges = {
	ort: Ort;
	ranges: {
		daterange: BerichtgenDateRange;
		stunden?: null | number;
	}[];
};

type RemoveUndefined<T> = {
	[K in keyof T]: Exclude<T[K], undefined>;
};

// ------------------------------------------------

export const completionApiSchema = z.object({
	ort: z.enum([Ort.SCHULE, Ort.BETRIEB]),
	text: z.string().nonempty()
});

// ------------------------------------------------

const ortEnum = z.enum([
	Ort.SCHULE,
	Ort.BETRIEB,
	Ort.UNTERWEISUNG,
	Ort['SCHULE/BETRIEB']
]);

/** Completion item carrying a base64-encoded file (≤ 1 MB). */
const inlineItemSchema = z.object({
	/** Base64-encoded file content. */
	data: z.string().nonempty(),
	mimeType: z.string().nonempty(),
	ort: ortEnum,
	type: z.literal('inline')
});

/** Completion item referencing a file uploaded to the Gemini Files API. */
const fileApiItemSchema = z.object({
	/** Gemini Files API URI returned after a resumable upload. */
	fileUri: z.url(),
	mimeType: z.string().nonempty(),
	ort: ortEnum,
	type: z.literal('gcs')
});

/** Completion item referencing a web URL — Gemini fetches it via Google Search grounding. */
const urlItemSchema = z.object({
	ort: ortEnum,
	type: z.literal('url'),
	url: z.url()
});

/** One item in a batch completion request — inline file, GCS file, or URL. */
export const batchCompletionItemSchema = z.discriminatedUnion('type', [
	inlineItemSchema,
	fileApiItemSchema,
	urlItemSchema
]);

export type BatchCompletionItem = z.infer<typeof batchCompletionItemSchema>;

/** Schema for the batch completion endpoint request body. */
export const batchCompletionApiSchema = z.object({
	items: z.array(batchCompletionItemSchema).min(1)
});

// ------------------------------------------------

/** Request body for `POST /board/user/upload-url`. */
export const uploadUrlRequestSchema = z.object({
	contentType: z.string().nonempty(),
	fileName: z.string().nonempty(),
	fileSize: z.number().int().positive(),
	fullFilePath: z.string().nonempty()
});

/**
 * Response from the batch completion endpoint.
 * `results[i]` is `null` when item i was not processed due to an insufficient token budget.
 * `insufficient_tokens` is true when some items were skipped for that reason.
 */
export type BatchCompletionApiResponse = {
	insufficient_tokens: boolean;
	results: (null | string[])[];
};

export const csvConfigSchema = z
	.object({
		file: z.string().nonempty({ message: 'Dateiname muss angegeben werden.' }),
		ort: z.enum(Ort, {
			message: 'Ort muss ein gültiger Ort sein.'
		}),
		ranges: z
			.object({
				daterange: z.object({
					end: z.instanceof(CalendarDate, {
						message: 'Enddatum muss angegeben werden.'
					}),
					start: z.instanceof(CalendarDate, {
						message: 'Startdatum muss angegeben werden.'
					})
				}),
				stunden: z.number().int().min(0).optional()
			})
			.array()
	})
	.array();

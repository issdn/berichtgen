import type { DateRange } from 'bits-ui';

import { Ort } from '$wizard/enums';
import { CalendarDate } from '@internationalized/date';
import z from 'zod';

export const genaiCompletionSchema = z.array(
	z.string().nonempty({ message: 'Der Text darf nicht leer sein.' }),
	{ error: 'Die Liste darf nicht leer sein.' }
);

const ortEnum = z.enum([
	Ort.SCHULE,
	Ort.BETRIEB,
	Ort.UNTERWEISUNG,
	Ort['SCHULE/BETRIEB']
]);

const fullResultSchema = z
	.object({
		datum: z.string({ message: 'Das Object muss ein Datum enthalten!' }),
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
	ort: ortEnum,
	ranges: z
		.object({
			daterange: z.custom<BerichtgenDateRange>(
				(data) => {
					if (typeof data !== 'object' || data === null) return false;
					const { end, start } = data as { end: unknown; start: unknown };
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

export const completionResultSchema = z.array(
	z.object({
		ort: ortEnum,
		text: z.string().nonempty()
	})
);

// ------------------------------------------------

/** Completion item carrying a base64-encoded file (≤ 1 MB). */
export const inlineItemSchema = z.object({
	/** Base64-encoded file content. */
	data: z.string().nonempty(),
	mimeType: z.string().nonempty(),
	type: z.literal('inline')
});

/** Completion item referencing a file uploaded to the Gemini Files API. */
export const fileApiItemSchema = z.object({
	/** Gemini Files API URI returned after a resumable upload. */
	fileUri: z.url(),
	mimeType: z.string().nonempty(),
	type: z.literal('gcs')
});

/** Completion item referencing a web URL — Gemini fetches it via Google Search grounding. */
export const urlItemSchema = z.object({
	type: z.literal('url'),
	url: z.url()
});

/** One item in a batch completion request — inline file, GCS file, or URL. */
const batchCompletionItemSchema = z.discriminatedUnion('type', [
	z.object({ ...inlineItemSchema.shape, ort: ortEnum }),
	z.object({ ...fileApiItemSchema.shape, ort: ortEnum }),
	z.object({ ...urlItemSchema.shape, ort: ortEnum })
]);

export type BatchCompletionItem = z.infer<typeof batchCompletionItemSchema> & {
	ort: Ort;
};

/** Schema for the batch completion endpoint request body. */
export const batchCompletionApiSchema = z.object({
	items: z.array(batchCompletionItemSchema).min(1)
});

// ------------------------------------------------

/** Request body for `POST /board/user/upload-url`. */
export const uploadUrlRequestSchema = z.object({
	fileName: z.string().nonempty(),
	fileSize: z.number().int().positive(),
	fullFilePath: z.string().nonempty()
});

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

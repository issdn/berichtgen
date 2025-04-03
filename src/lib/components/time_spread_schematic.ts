import type { DateRange } from 'bits-ui';
import * as z from 'zod';

export const dateRangeSchema = z.object({
	values: z
		.object({
			id: z.number().int().min(0),
			daterange: z.custom<IncuriaDateRange>(
				({ start, end }) => start !== undefined && end !== undefined
			),
			hours: z.number().int().optional().nullable()
		})
		.array()
});

export type DateRangeSchema = z.infer<typeof dateRangeSchema>;

type RemoveUndefined<T> = {
	[K in keyof T]: Exclude<T[K], undefined>;
};

export type IncuriaDateRange = Pick<RemoveUndefined<DateRange>, 'end'> & Pick<DateRange, 'start'>;

export type ValidIncuriaDateRanges = { daterange: IncuriaDateRange; hours?: number | null }[];

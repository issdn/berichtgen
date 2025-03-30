import type { IncuriaDateRange } from '$lib/types';
import * as z from 'zod';

export const dateRangeSchema = z.object({
	values: z
		.object({
			id: z.number().int().min(0),
			daterange: z.custom<IncuriaDateRange>(
				({ start, end }) => start !== undefined && end !== undefined
			),
			hours: z.number().int()
		})
		.array()
});

export type DateRangeSchema = z.infer<typeof dateRangeSchema>;

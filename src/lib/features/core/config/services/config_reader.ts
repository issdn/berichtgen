import type { CSVConfig } from '$wizard/types';

import { EParserError } from '$core/parser/errors';
import { type Result, tryResultAsync } from '$lib/result';
import { Ort } from '$wizard/enums';
import { csvConfigSchema } from '$wizard/schemas';
import { parseDate } from '@internationalized/date';

export function readCsvConfig(file: File): Promise<Result<CSVConfig>> {
	return tryResultAsync({
		apiError: EParserError.PARSE_FAILED,
		promise: file.arrayBuffer().then((buffer) => {
			const text = new TextDecoder().decode(buffer);
			return readCsvConfigFromText(text);
		})
	});
}

// ort, file, start;end;stunden
export function readCsvConfigFromText(text: string): CSVConfig {
	const lines = text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	const data: CSVConfig = [];

	for (let i = 0; i < lines.length; i++) {
		const values = lines[i]
			.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)!
			.map((value) => value.trim().replace(/^"|"$/g, ''));

		const ort = values.shift() as Ort;
		const file = values.shift() as string;

		const ranges = values.map((value) => {
			const [start, end, stunden] = value.split(';').map((part) => part.trim());
			return {
				daterange: { end: parseDate(end), start: parseDate(start) },
				stunden: stunden ? parseInt(stunden) : undefined
			};
		});
		data.push({ file, ort, ranges });
	}

	return csvConfigSchema.parse(data);
}

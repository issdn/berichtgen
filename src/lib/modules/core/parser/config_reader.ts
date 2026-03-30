import { ParserError, EParserError } from '$core/parser/errors';
import { type Result, tryResult } from '$lib/result';
import type { CSVConfig } from '$wizard/types';
import { Ort } from '$wizard/enums';
import { csvConfigSchema } from '$wizard/schemas';
import { parseDate } from '@internationalized/date';

export function readCsvConfig(file: File): Promise<Result<CSVConfig>> {
	return tryResult(
		file.arrayBuffer().then((buffer) => {
			const text = new TextDecoder().decode(buffer);
			return readCsvConfigFromText(text);
		}),
		() => new ParserError(EParserError.PARSE_FAILED)
	);
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
				daterange: { start: parseDate(start), end: parseDate(end) },
				stunden: stunden ? parseInt(stunden) : undefined
			};
		});
		data.push({ ort, file, ranges });
	}

	return csvConfigSchema.parse(data);
}

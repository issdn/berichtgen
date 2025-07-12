import type { Ort } from '$src/lib/enums';
import { IncuriaError } from '$src/lib/errors';
import { csvConfigSchema } from '$src/lib/schemas';
import type { CSVConfig } from '$src/lib/types';
import { parseDate } from '@internationalized/date';
import { ResultAsync } from 'neverthrow';

export function readCsvConfig(file: File) {
	return ResultAsync.fromPromise(file.arrayBuffer(), (e) =>
		IncuriaError.fromUnknown(e, 'Config Datei ist nicht lesbar')
	).andThen(
		ResultAsync.fromThrowable(
			async (buffer) => {
				const text = new TextDecoder().decode(buffer);
				return readCsvConfigFromText(text);
			},
			(e) => IncuriaError.fromUnknown(e, 'Fehler beim Lesen der CSV-Konfiguration')
		)
	);
}

// ort, file, start;end;hours
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
			const [start, end, hours] = value.split(';').map((part) => part.trim());
			return {
				daterange: { start: parseDate(start), end: parseDate(end) },
				hours: hours ? parseInt(hours) : undefined
			};
		});
		data.push({ ort, file, ranges });
	}

	return csvConfigSchema.parse(data);
}

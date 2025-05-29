import { readCsvConfigFromText } from '$src/lib/parse/config_reader';
import { parseDate } from '@internationalized/date';
import { expect, test } from 'vitest';

test('CSV Config Reader', async () => {
	// ort, file, start;end;hours
	const testCSV = 'SCHULE,example.test,2023-01-01;2023-01-07,2023-02-01;2023-02-13;40';
	const expected = [
		{
			ort: 'SCHULE',
			file: 'example.test',
			ranges: [
				{
					daterange: { start: parseDate('2023-01-01'), end: parseDate('2023-01-07') },
				},
				{
					daterange: { start: parseDate('2023-02-01'), end: parseDate('2023-02-13') },
					hours: 40
				},
			]
		}
	];

	const result = readCsvConfigFromText(testCSV);

	expect(result.length).toBe(expected.length);

	result.forEach((o, i) => {
		const expectedEntry = expected[i];
		expect(o).toMatchObject(expectedEntry);
	});
});

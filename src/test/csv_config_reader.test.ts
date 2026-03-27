import { readCsvConfigFromText } from '$core/parser/config_reader';
import { parseDate } from '@internationalized/date';
import { expect, test } from 'vitest';

test('Filename with comma', async () => {
	// ort, file, start;end;stunden
	const testCSV =
		'SCHULE,"first, example.test",2023-01-01;2023-01-07,2023-02-01;2023-02-13;40';
	const expected = [
		{
			ort: 'SCHULE',
			file: 'first, example.test',
			ranges: [
				{
					daterange: {
						start: parseDate('2023-01-01'),
						end: parseDate('2023-01-07')
					}
				},
				{
					daterange: {
						start: parseDate('2023-02-01'),
						end: parseDate('2023-02-13')
					},
					stunden: 40
				}
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

test('No comma with quotes', async () => {
	// ort, file, start;end;stunden
	const testCSV =
		'SCHULE,"example.test",2023-01-01;2023-01-07,2023-02-01;2023-02-13;40';
	const expected = [
		{
			ort: 'SCHULE',
			file: 'example.test',
			ranges: [
				{
					daterange: {
						start: parseDate('2023-01-01'),
						end: parseDate('2023-01-07')
					}
				},
				{
					daterange: {
						start: parseDate('2023-02-01'),
						end: parseDate('2023-02-13')
					},
					stunden: 40
				}
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

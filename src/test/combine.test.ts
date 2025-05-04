import { combineJSONs } from '$lib/parse/combine';
import { Ort, Qualifikationen } from '$src/lib/types';
import { test, expect } from 'vitest';

const qualifikationen = [Qualifikationen[0]];

test('combine json entries by day ', () => {
	const testEntries = [
		[
			{
				qualifikationen,
				text: '2025-03-10',
				datum: '2025-03-10',
				hours: 1,
				ort: Ort.BETRIEB
			},
			{
				qualifikationen,
				text: '2025-03-17',
				datum: '2025-03-17',
				hours: 1,
				ort: Ort.BETRIEB
			}
		],
		[
			{
				qualifikationen,
				text: '2025-03-17 2',
				datum: '2025-03-17',
				hours: 1,
				ort: Ort.BETRIEB
			},
			{
				qualifikationen,
				text: '2025-03-24',
				datum: '2025-03-24',
				hours: 1,
				ort: Ort.BETRIEB
			}
		]
	];

	const expected = [
		{
			qualifikationen,
			text: '2025-03-10',
			datum: '2025-03-10',
			hours: 1,
			ort: Ort.BETRIEB
		},
		{
			qualifikationen,
			text: '2025-03-17\n\n2025-03-17 2',
			datum: '2025-03-17',
			hours: 2,
			ort: Ort.BETRIEB
		},
		{
			qualifikationen,
			text: '2025-03-24',
			datum: '2025-03-24',
			hours: 1,
			ort: Ort.BETRIEB
		}
	];

	const combined = combineJSONs(testEntries);

	expect(combined.length).toBe(expected.length);

	combined.forEach((o, i) => {
		const expectedEntry = expected[i];
		expect(o).toMatchObject(expectedEntry);
	});
});

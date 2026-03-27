import { combineJSONs } from '$wizard/postprocess/combine';
import { Ort } from '$wizard/enums';
import { test, expect } from 'vitest';
import type { ResultEntry } from '$wizard/types';

function makeEntry(text: string, datum: string): ResultEntry {
	return {
		text,
		datum,
		endDatum: '',
		stunden: 1,
		ort: Ort.BETRIEB,
		ausbildungsjahr: 1
	};
}

test('combine json entries by day ', () => {
	const testEntries = [
		[
			makeEntry('2025-03-10', '2025-03-10'),
			makeEntry('2025-03-17', '2025-03-17')
		],
		[
			makeEntry('2025-03-17 2', '2025-03-17'),
			makeEntry('2025-03-24', '2025-03-24')
		]
	];

	const combined = combineJSONs(testEntries);

	// combineJSONs sorts reverse-chronological
	expect(combined).toHaveLength(3);
	expect(combined[0]).toMatchObject({
		datum: '2025-03-24',
		text: '- 2025-03-24',
		stunden: 1
	});
	expect(combined[1]).toMatchObject({
		datum: '2025-03-17',
		text: '- 2025-03-17\n- 2025-03-17 2',
		stunden: 2
	});
	expect(combined[2]).toMatchObject({
		datum: '2025-03-10',
		text: '- 2025-03-10',
		stunden: 1
	});
});

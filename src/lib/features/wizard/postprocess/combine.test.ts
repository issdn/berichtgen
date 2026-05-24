import type { ResultEntry } from '$wizard/types';

import { Ort } from '$wizard/enums';
import { combineJSONs } from '$wizard/postprocess/combine';
import { expect, test } from 'vitest';

function makeEntry(text: string, datum: string): ResultEntry {
	return {
		ausbildungsjahr: 1,
		datum,
		endDatum: '',
		ort: Ort.BETRIEB,
		stunden: 1,
		text
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
		stunden: 1,
		text: '2025-03-24'
	});
	expect(combined[1]).toMatchObject({
		datum: '2025-03-17',
		stunden: 2
	});
	expect(combined[1].text).toContain('2025-03-17');
	expect(combined[1].text).toContain('2025-03-17 2');
	expect(combined[2]).toMatchObject({
		datum: '2025-03-10',
		stunden: 1,
		text: '2025-03-10'
	});
});

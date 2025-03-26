import { combineJSONs } from '$lib/parse/combine';
import { expect, test } from 'bun:test';

test('combine json entries by day ', () => {
	const testEntries = [
		[
			{
				qualifikationen: ['Eine Qualifikation'],
				text: '2025-03-10',
				datum: '2025-03-10'
			},
			{
				qualifikationen: ['Eine Qualifikation'],
				text: '2025-03-17',
				datum: '2025-03-17'
			}
		],
		[
			{
				qualifikationen: ['Eine Qualifikation'],
				text: '2025-03-17 2',
				datum: '2025-03-17'
			},
			{
				qualifikationen: ['Eine Qualifikation'],
				text: '2025-03-24',
				datum: '2025-03-24'
			}
		]
	];

	const expected = [
		{
			qualifikationen: ['Eine Qualifikation'],
			text: '2025-03-10',
			datum: '2025-03-10'
		},
		{
			qualifikationen: ['Eine Qualifikation'],
			text: '2025-03-17',
			datum: '2025-03-17'
		},
		{
			qualifikationen: ['Eine Qualifikation'],
			text: '2025-03-17 2',
			datum: '2025-03-17'
		},
		{
			qualifikationen: ['Eine Qualifikation'],
			text: '2025-03-24',
			datum: '2025-03-24'
		}
	];

	expect(combineJSONs(testEntries)).toEqual(expected);
});

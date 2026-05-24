import type { ResultEntry } from '$wizard/types';

import { parseDate } from '@internationalized/date';

export function combineJSONs(
	jsons: ResultEntry[][],
	constantHours: boolean = false
) {
	const byDateMap = new Map<string, ResultEntry[]>();
	jsons.forEach((json) => {
		json.forEach((entry) => {
			const date = entry.datum;
			if (!byDateMap.has(date)) {
				byDateMap.set(date, []);
			}
			byDateMap.get(date)?.push(entry);
		});
	});
	return Array.from(byDateMap.entries())
		.map(([_, entries]) => {
			const [firstEntry, ...restEntries] = entries;
			const combinedEntry = restEntries.reduce(
				(acc, entry) => ({
					...acc,
					stunden: acc.stunden + entry.stunden,
					text: acc.text + `\n\n${entry.text}`
				}),
				firstEntry
			);
			combinedEntry.text = combinedEntry.text.trim();
			combinedEntry.stunden = constantHours ? 40 : combinedEntry.stunden;
			return combinedEntry;
		})
		.sort(({ datum: a }, { datum: b }) => parseDate(b).compare(parseDate(a)));
}

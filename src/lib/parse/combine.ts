import { Ort, type QualifikationenType, type ResultEntry } from '$lib/types';
import { parseDate } from '@internationalized/date';

export function combineJSONs(jsons: ResultEntry[][], constantHours: boolean = false) {
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
		.map(([date, entries]) => {
			const combinedEntry = entries.reduce(
				(acc, entry) => {
					acc.text += entry.text + '\n\n';
					acc.hours += entry.hours;
					acc.qualifikationen = [...new Set([...acc.qualifikationen, ...entry.qualifikationen])];
					acc.ort = entry.ort;
					return acc;
				},
				{
					qualifikationen: [] as QualifikationenType[],
					text: '',
					datum: date,
					hours: 0,
					ort: Ort.BETRIEB
				}
			);
			combinedEntry.text = combinedEntry.text.trim();
			combinedEntry.hours = constantHours ? 40 : combinedEntry.hours;
			return combinedEntry;
		})
		.sort(({ datum: a }, { datum: b }) => parseDate(a).compare(parseDate(b)));
}

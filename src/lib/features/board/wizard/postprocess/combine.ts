import type { ResultEntry } from '$wizard/types';
import { Ort } from '$wizard/enums';
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
			const combinedEntry = entries.reduce(
				(acc, entry) => ({
					...acc,
					text: acc.text + `\n\n${entry.text}`,
					stunden: acc.stunden + entry.stunden
				}),
				{
					text: '',
					datum: '',
					endDatum: '',
					ausbildungsjahr: 0,
					stunden: 0,
					ort: Ort.BETRIEB as Ort
				}
			);
			combinedEntry.text = combinedEntry.text.trim();
			combinedEntry.stunden = constantHours ? 40 : combinedEntry.stunden;
			return combinedEntry;
		})
		.sort(({ datum: a }, { datum: b }) => parseDate(b).compare(parseDate(a)));
}

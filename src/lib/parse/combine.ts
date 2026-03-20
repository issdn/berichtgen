import { type QualifikationenType, type ResultEntry } from '$lib/types';
import { BULLETPOINT } from '$src/lib/constants';
import { Ort } from '$src/lib/enums';
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
		.map(([date, entries]) => {
			const combinedEntry = entries.reduce(
				(acc, entry) => {
					acc.text += BULLETPOINT + entry.text;
					acc.stunden += entry.stunden;
					acc.qualifikationen = [
						...new Set([...acc.qualifikationen, ...entry.qualifikationen])
					];
					acc.ort = entry.ort;
					return acc;
				},
				{
					qualifikationen: [] as QualifikationenType[],
					text: '',
					datum: date,
					stunden: 0,
					ort: Ort.BETRIEB
				}
			);
			combinedEntry.text = combinedEntry.text.trim();
			combinedEntry.stunden = constantHours ? 40 : combinedEntry.stunden;
			return combinedEntry;
		})
		.sort(({ datum: a }, { datum: b }) => parseDate(b).compare(parseDate(a)));
}

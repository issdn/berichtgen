import type { Entry } from '$lib/types';
import { parseDate } from '@internationalized/date';

export function combineJSONs(jsons: Required<Entry>[][]) {
	return jsons
		.reduce((prev, next) => [...prev, ...next], [])
		.sort(({ datum: a }, { datum: b }) => parseDate(a).compare(parseDate(b)));
}

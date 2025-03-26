import type { Entry } from '$lib/types';
import dayjs from 'dayjs';

export function combineJSONs(jsons: Required<Entry>[][]) {
	return jsons
		.reduce((prev, next) => [...prev, ...next], [])
		.sort(({ datum: a }, { datum: b }) => dayjs(a).diff(dayjs(b)));
}

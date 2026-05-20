import { test, expect } from 'vitest';
import { buildConfigMap } from '$core/config/services/config_generator';
import { LOCALE, TIMEZONE } from '$lib/constants';
import { now, startOfWeek, toCalendarDate } from '@internationalized/date';

function makeEntry(fullPath: string): FileSystemFileEntry {
	return {
		fullPath,
		name: fullPath.split('/').at(-1)!
	} as unknown as FileSystemFileEntry;
}

test('generates single config with relative paths from the dropped root folder', () => {
	const files = [
		makeEntry('/notes/raid-full-page-with-img.pdf'),
		makeEntry('/notes/hist/Balkanfeldzug_(1941).pdf'),
		makeEntry('/notes/hist/Jugoslawischer_Kriegsschauplatz.pdf'),
		makeEntry(
			'/notes/hist/Timeline_of_Russian_interference_in_the_2016_United_States_elections.pdf'
		)
	];

	const result = buildConfigMap(files);

	const mondayOfWeek = toCalendarDate(
		startOfWeek(now(TIMEZONE), LOCALE, 'mon')
	);
	const endOfWeek = mondayOfWeek.copy().add({ days: 7 });

	expect(result.size).toBe(1);
	expect(result.get('notes')).toBe(
		`SCHULE,"raid-full-page-with-img.pdf",${mondayOfWeek};${endOfWeek};40\n` +
			`SCHULE,"Balkanfeldzug_(1941).pdf",${mondayOfWeek};${endOfWeek};40\n` +
			`SCHULE,"Jugoslawischer_Kriegsschauplatz.pdf",${mondayOfWeek};${endOfWeek};40\n` +
			`SCHULE,"Timeline_of_Russian_interference_in_the_2016_United_States_elections.pdf",${mondayOfWeek};${endOfWeek};40\n`
	);
});

import type { ValidIncuriaDateRanges } from '$lib/components/time_spread_schematic';
import type { Entry } from '$lib/types';
import { startOfYear, CalendarDate, startOfWeek } from '@internationalized/date';

const LOCALE = 'de-DE';

export function spreadEntriesAcrossWeeks(
	entries: Entry[],
	dateRanges: ValidIncuriaDateRanges
): Required<Entry>[] {
	const hoursSum = dateRanges.reduce(
		(prev, { daterange, hours }) =>
			prev +
			(hours ??
				getWeek(daterange.end as CalendarDate, LOCALE) -
					getWeek(daterange.start as CalendarDate, LOCALE) +
					1),
		0
	);

	const sorted = dateRanges.sort((a, b) => a.daterange.start!.compare(b.daterange.end));

	const minWeek = sorted[0];

	const weeks = dateRanges.reduce((prev, { daterange }) => {
		return (
			prev +
			getWeek(daterange.end as CalendarDate, LOCALE) -
			getWeek(daterange.start as CalendarDate, LOCALE) +
			1
		);
	}, 0);

	const newEntries: Required<Entry>[] = [];

	const adjustedForHours = sorted.map((week) => ({
		...week,
		entriesPerWeek: Math.floor(entries.length * ((week.hours ?? 1) / hoursSum))
	}));

	let currWeekIndex = 0;
	let entriesTotal = 0;
	let mondayOfWeek = startOfWeek(minWeek.daterange.start!, LOCALE, 'mon') as CalendarDate;

	for (let i = 0; i < weeks; i += 1) {
		const { entriesPerWeek, daterange } = adjustedForHours[currWeekIndex];

		for (let j = 0; j < entriesPerWeek; j++) {
			newEntries.push(cloneObjectWithDate(entries, entriesTotal + j, mondayOfWeek));
		}

		entriesTotal += entriesPerWeek;

		if (i * entriesPerWeek + entriesPerWeek < weeks * entriesPerWeek)
			mondayOfWeek = mondayOfWeek.add({ days: 7 });

		if (
			!(
				getWeek(mondayOfWeek, LOCALE) >= getWeek(daterange.start as CalendarDate, LOCALE) &&
				getWeek(mondayOfWeek, LOCALE) <= getWeek(daterange.end as CalendarDate, LOCALE)
			)
		) {
			currWeekIndex++;
			mondayOfWeek = startOfWeek(sorted[currWeekIndex].daterange.start!, LOCALE) as CalendarDate;
		}
	}

	if (entries.length > entriesTotal) {
		newEntries.push(cloneObjectWithDate(entries, entries.length - 1, mondayOfWeek));
	}

	return newEntries;
}

function cloneObjectWithDate(entries: Entry[], i: number, date: CalendarDate): Required<Entry> {
	return {
		...entries[i],
		datum: date.toString()
	};
}

function getWeek(date: CalendarDate, locale: string) {
	const weekStart = startOfWeek(date, locale);
	const yearStart = startOfWeek(startOfYear(date), locale);

	const dayOfYear =
		date.calendar.toJulianDay(weekStart) - yearStart.calendar.toJulianDay(yearStart);
	return dayOfYear / 7;
}

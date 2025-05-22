import type { Entry, Ort, ResultEntry } from '$lib/types';
import type { ValidIncuriaDateRanges } from '$src/lib/schemas';
import { startOfYear, CalendarDate, startOfWeek } from '@internationalized/date';

const LOCALE = 'de-DE';

export function spreadEntriesAcrossWeeks(
	entries: Entry[],
	{ ranges, location }: ValidIncuriaDateRanges
): Required<Entry>[] {
	const hoursSum = ranges.reduce(
		(prev, { daterange, hours }) =>
			prev +
			(hours ??
				getWeek(daterange.end as CalendarDate, LOCALE) -
					getWeek(daterange.start as CalendarDate, LOCALE) +
					1),
		0
	);

	const sorted = ranges.sort((a, b) => a.daterange.start!.compare(b.daterange.end));

	const minWeek = sorted[0];

	const weeks = ranges.reduce((prev, { daterange }) => {
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
		hours: week.hours ?? 1,
		entriesPerWeek: Math.floor(entries.length * ((week.hours ?? 1) / hoursSum))
	}));

	let currWeekIndex = 0;
	let entriesTotal = 0;
	let mondayOfWeek = startOfWeek(minWeek.daterange.start!, LOCALE, 'mon') as CalendarDate;

	for (let i = 0; i < weeks; i += 1) {
		const { entriesPerWeek, daterange, hours } = adjustedForHours[currWeekIndex];

		for (let j = 0; j < entriesPerWeek; j++) {
			newEntries.push(
				cloneObjectWithDate(entries[entriesTotal + j], mondayOfWeek, location, hours)
			);
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
		newEntries.push(
			cloneObjectWithDate(
				entries[entries.length - 1],
				mondayOfWeek,
				location,
				adjustedForHours[ranges.length - 1].hours
			)
		);
	}

	return newEntries;
}

function cloneObjectWithDate(
	entry: Entry,
	date: CalendarDate,
	location: Ort,
	hours: number
): ResultEntry {
	return {
		...entry,
		datum: date.toString(),
		ort: location,
		hours
	};
}

function getWeek(date: CalendarDate, locale: string) {
	const weekStart = startOfWeek(date, locale);
	const yearStart = startOfWeek(startOfYear(date), locale);

	const dayOfYear =
		date.calendar.toJulianDay(weekStart) - yearStart.calendar.toJulianDay(yearStart);
	return dayOfYear / 7;
}

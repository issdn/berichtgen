import type { Entry, Ort, ResultEntry } from '$lib/types';
import type { ValidIncuriaDateRanges } from '$src/lib/schemas';
import { startOfYear, CalendarDate, startOfWeek } from '@internationalized/date';

const LOCALE = 'de-DE';

/**
 *
 * ranges: [2 weeks, 3 weeks] -> 5 weeks in total
 * entries: 14
 * entriesPerWeek: 14 / 5 = 2.8 -> [3,3,3,3,2]
 *
 */
export function spreadEntriesAcrossWeeks(
	entries: Entry[],
	{ ranges, ort }: ValidIncuriaDateRanges
): Required<Entry>[] {
	const hoursSum = ranges.reduce(
		(prev, { daterange, hours }) =>
			prev + (hours ?? weekDiff(daterange.start as CalendarDate, daterange.end as CalendarDate)),
		0
	);

	const sorted = ranges.sort((a, b) => a.daterange.start!.compare(b.daterange.end));

	const minWeek = sorted[0];

	const weeks = Math.min(
		ranges.reduce((prev, { daterange }) => {
			return prev + weekDiff(daterange.start as CalendarDate, daterange.end as CalendarDate);
		}, 0),
		entries.length
	);

	const adjustedForHours = sorted.map((week) => ({
		...week,
		hours: week.hours ?? 1,
		entriesPerWeek: Math.max(
			((entries.length /
				weekDiff(week.daterange.start as CalendarDate, week.daterange.end as CalendarDate)) *
				(week.hours ?? 1)) /
				hoursSum,
			1
		)
	}));

	const newEntries: Required<Entry>[] = [];

	let currWeekIndex = 0;
	let entriesTotal = 0;
	let mondayOfWeek = startOfWeek(minWeek.daterange.start!, LOCALE, 'mon') as CalendarDate;

	for (let i = 0; i < weeks; i += 1) {
		const { entriesPerWeek, daterange, hours } = adjustedForHours[currWeekIndex];
		const entriesPerWeekEven = Math.floor(entriesPerWeek);
		const entriesPerWeekRemainder = entriesPerWeek - entriesPerWeekEven;

		for (let j = 0; j < entriesPerWeekEven; j++) {
			newEntries.push(cloneObjectWithDate(entries[entriesTotal + j], mondayOfWeek, ort, hours));
		}

		entriesTotal += entriesPerWeekEven;

		if (i + 1 <= Math.round(entriesPerWeekRemainder * weeks)) {
			newEntries.push(cloneObjectWithDate(entries[entriesTotal], mondayOfWeek, ort, hours));
			entriesTotal++;
		}

		if (i * entriesPerWeekEven + entriesPerWeekEven < weeks * entriesPerWeekEven)
			mondayOfWeek = mondayOfWeek.add({ days: 7 });

		if (
			!(
				getWeek(mondayOfWeek) >= getWeek(daterange.start as CalendarDate) &&
				getWeek(mondayOfWeek) <= getWeek(daterange.end as CalendarDate)
			)
		) {
			currWeekIndex++;
			mondayOfWeek = startOfWeek(sorted[currWeekIndex].daterange.start!, LOCALE) as CalendarDate;
		}
	}

	return newEntries;
}

function cloneObjectWithDate(
	entry: Entry,
	date: CalendarDate,
	ort: Ort,
	hours: number
): ResultEntry {
	return {
		...entry,
		datum: date.toString(),
		ort,
		hours
	};
}

function weekDiff(start: CalendarDate, end: CalendarDate) {
	const startWeek = getWeek(start);
	const endWeek = getWeek(end);
	return endWeek - startWeek + 1;
}

function getWeek(date: CalendarDate) {
	const weekStart = startOfWeek(date, LOCALE);
	const yearStart = startOfWeek(startOfYear(date), LOCALE);

	// Calculate the week number in the year
	const daysSinceYearStart =
		weekStart.calendar.toJulianDay(weekStart) - yearStart.calendar.toJulianDay(yearStart);
	const weekOfYear = Math.floor(daysSinceYearStart / 7);

	// Use year and week to get an absolute week number
	return date.year * 52 + weekOfYear;
}

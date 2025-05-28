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
			(hours ?? weekDiff(daterange.start as CalendarDate, daterange.end as CalendarDate)),
		0
	);

	const sorted = ranges.sort((a, b) => a.daterange.start!.compare(b.daterange.end));

	const minWeek = sorted[0];

	const weeks = ranges.reduce((prev, { daterange }) => {
		return prev + weekDiff(daterange.start as CalendarDate, daterange.end as CalendarDate);
	}, 0);

	const newEntries: Required<Entry>[] = [];

	const adjustedForHours = sorted.map((week) => ({
		...week,
		hours: week.hours ?? 1,
		entriesPerWeek: Math.max(Math.floor(
			entries.length /
				weekDiff(week.daterange.start as CalendarDate, week.daterange.end as CalendarDate) *
				(week.hours ?? 1) / hoursSum
		), 1)
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
				getWeek(mondayOfWeek) >= getWeek(daterange.start as CalendarDate) &&
				getWeek(mondayOfWeek) <= getWeek(daterange.end as CalendarDate)
			)
		) {
			currWeekIndex++;
			mondayOfWeek = startOfWeek(sorted[currWeekIndex].daterange.start!, LOCALE) as CalendarDate;
		}
	}

	for(let i = 0; i < entries.length - entriesTotal; i++) {
		newEntries.push(
			cloneObjectWithDate(
				entries[entriesTotal + i],
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

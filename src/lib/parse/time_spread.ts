import type { IncuriaWeightedDateRange, Entry } from '$lib/types';
import { startOfYear, CalendarDate, parseDate, startOfWeek } from '@internationalized/date';

const LOCALE = 'de-DE';

export function spreadEntriesAcrossWeeks(
	entries: Entry[],
	dateRanges: IncuriaWeightedDateRange[]
): Required<Entry>[] {
	const convertedDates = dateRanges.map(({ startDate, endDate, hours }) => ({
		startDate: parseDate(startDate),
		endDate: parseDate(endDate),
		hours
	}));

	const hoursSum = convertedDates.reduce(
		(prev, { startDate, endDate, hours }) =>
			prev + (hours ?? getWeek(endDate, LOCALE) - getWeek(startDate, LOCALE) + 1),
		0
	);

	const sorted = convertedDates.sort((a, b) => a.startDate.compare(b.startDate));

	const minWeek = sorted[0];

	const weeks = convertedDates.reduce((prev, { startDate, endDate }) => {
		return prev + getWeek(endDate, LOCALE) - getWeek(startDate, LOCALE) + 1;
	}, 0);

	const newEntries: Required<Entry>[] = [];

	const adjustedForHours = sorted.map((week) => ({
		...week,
		entriesPerWeek: Math.floor(entries.length * ((week.hours ?? 1) / hoursSum))
	}));

	let currWeekIndex = 0;
	let entriesTotal = 0;
	let mondayOfWeek = startOfWeek(minWeek.startDate, LOCALE, 'mon');

	for (let i = 0; i < weeks; i += 1) {
		const { entriesPerWeek, startDate, endDate } = adjustedForHours[currWeekIndex];

		for (let j = 0; j < entriesPerWeek; j++) {
			newEntries.push(cloneObjectWithDate(entries, entriesTotal + j, mondayOfWeek));
		}

		entriesTotal += entriesPerWeek;

		if (i * entriesPerWeek + entriesPerWeek < weeks * entriesPerWeek)
			mondayOfWeek = mondayOfWeek.add({ days: 7 });

		if (
			!(
				getWeek(mondayOfWeek, LOCALE) >= getWeek(startDate, LOCALE) &&
				getWeek(mondayOfWeek, LOCALE) <= getWeek(endDate, LOCALE)
			)
		) {
			currWeekIndex++;
			mondayOfWeek = startOfWeek(sorted[currWeekIndex].startDate, LOCALE);
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

import type { DateValue } from '@internationalized/date';

import { CalendarDate } from '@internationalized/date';

export type WeekDateRange = {
	end: DateValue;
	start: DateValue;
};

export type WeekDateSelection = {
	end: DateValue | undefined;
	start: DateValue | undefined;
};

export type WeekRangeCell = {
	end: CalendarDate;
	index: number;
	inYear: boolean;
	label: string;
	start: CalendarDate;
};

export type WeekRangeMonthColumn = {
	label: string;
	month: number;
	weeks: WeekRangeCell[];
};

export type WeekRangeHalfYearPage = {
	half: 1 | 2;
	months: WeekRangeMonthColumn[];
	year: number;
};

/** Builds a fixed-size grid of week ranges for a given calendar year. */
export function buildWeekRangeGrid({
	totalWeeks = 48,
	year
}: {
	totalWeeks?: number;
	year: number;
}): WeekRangeCell[] {
	const firstVisibleWeekStart = getFirstMondayOfYear({ year });

	return Array.from({ length: totalWeeks }, (_, index) => {
		const start = firstVisibleWeekStart.add({ days: index * 7 }) as CalendarDate;
		const end = start.add({ days: 6 }) as CalendarDate;

		return {
			end,
			index,
			inYear: start.year === year || end.year === year,
			label: `KW ${String(index + 1).padStart(2, '0')}`,
			start
		};
	});
}

/** Groups visible year weeks into half-year month columns for compact rendering. */
export function buildHalfYearPages({
	year
}: {
	year: number;
}): WeekRangeHalfYearPage[] {
	const monthLabels = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'Mai',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Okt',
		'Nov',
		'Dez'
	];
	const visibleWeeks = buildWeekRangeGrid({ year });

	return [1, 2].map((half) => {
		const startMonthIndex = half === 1 ? 0 : 6;
		const months = Array.from({ length: 6 }, (_, index) => {
			const monthIndex = startMonthIndex + index;
			return {
				label: monthLabels[monthIndex],
				month: monthIndex + 1,
				weeks: visibleWeeks.slice(monthIndex * 4, monthIndex * 4 + 4)
			};
		});

		return {
			half: half as 1 | 2,
			months,
			year
		};
	});
}

/** Returns the first Monday that belongs to the rendered year. */
export function getFirstMondayOfYear({
	year
}: {
	year: number;
}): CalendarDate {
	const start = new CalendarDate(year, 1, 1);
	const weekday = start.toDate('UTC').getUTCDay();
	const mondayOffset = weekday === 0 ? 1 : weekday === 1 ? 0 : 8 - weekday;
	return start.add({ days: mondayOffset }) as CalendarDate;
}

/** Creates a full-week date range between an anchor week and a target week. */
export function createWeekRange({
	anchor,
	target
}: {
	anchor: WeekRangeCell;
	target: WeekRangeCell;
}): WeekDateRange {
	if (target.start.compare(anchor.start) < 0) {
		return { end: anchor.end, start: target.start };
	}

	return { end: target.end, start: anchor.start };
}

/** Returns whether the week intersects the provided range. */
export function isWeekInRange({
	range,
	week
}: {
	range: WeekDateRange;
	week: WeekRangeCell;
}): boolean {
	return (
		week.end.compare(range.start) >= 0 && week.start.compare(range.end) <= 0
	);
}
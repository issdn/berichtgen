<script lang="ts">
	import { RangeCalendar as RangeCalendarPrimitive } from 'bits-ui';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as RangeCalendar from '$lib/components/ui/range-calendar/index.js';
	import { LOCALE, TIMEZONE } from '$lib/constants';
	import { cn, dateFormatter, type WithoutChildrenOrChild } from '$lib/utils';
	import { CalendarDate } from '@internationalized/date';
	import type { DateValue } from '@internationalized/date';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';

	import {
		buildHalfYearPages,
		createWeekRange,
		isWeekInRange,
		type WeekDateRange,
		type WeekDateSelection,
		type WeekRangeCell
	} from './week-range-calendar.helpers';

	let {
		ref = $bindable(null),
		value = $bindable<WeekDateSelection | undefined>(undefined),
		placeholder = $bindable(new CalendarDate(new Date().getFullYear(), 1, 1)),
		class: className,
		disabled = false,
		locale = LOCALE,
		...restProps
	}: WithoutChildrenOrChild<RangeCalendarPrimitive.RootProps> = $props();

	let hoveredWeek = $state<null | WeekRangeCell>(null);
	const visibleYear = $derived(placeholder.year);
	const visibleHalf = $derived((placeholder.month <= 6 ? 1 : 2) as 1 | 2);
	const selectedRangeLabel = $derived.by(() => {
		const start = value?.start ?? placeholder;
		const end = value?.end ?? placeholder;

		return `${dateFormatter.format(start.toDate(TIMEZONE))} - ${dateFormatter.format(end.toDate(TIMEZONE))}`;
	});

	const pages = $derived(buildHalfYearPages({ year: visibleYear }));
	const currentPage = $derived(
		pages.find((page) => page.half === visibleHalf) ?? pages[0]
	);
	const weeks = $derived(
		currentPage.months.flatMap((month) => month.weeks)
	);
	const maxRows = $derived(
		Math.max(...currentPage.months.map((month) => month.weeks.length), 0)
	);

	const selectedAnchorWeek = $derived.by(() => {
		const anchorStart = value?.start;
		if (!anchorStart) return null;
		return weeks.find((week) => week.start.compare(anchorStart) === 0) ?? null;
	});

	const displayRange = $derived.by(() => {
		if (selectedAnchorWeek === null) return null;
		if (value?.end) {
			return {
				end: value.end,
				start: selectedAnchorWeek.start
			} satisfies WeekDateRange;
		}
		if (hoveredWeek !== null) {
			return createWeekRange({
				anchor: selectedAnchorWeek,
				target: hoveredWeek
			});
		}

		return {
			end: selectedAnchorWeek.end,
			start: selectedAnchorWeek.start
		} satisfies WeekDateRange;
	});

	function movePage({ direction }: { direction: -1 | 1 }) {
		if (direction === -1) {
			placeholder =
				visibleHalf === 1
					? new CalendarDate(visibleYear - 1, 7, 1)
					: new CalendarDate(visibleYear, 1, 1);
			return;
		}

		placeholder =
			visibleHalf === 1
				? new CalendarDate(visibleYear, 7, 1)
				: new CalendarDate(visibleYear + 1, 1, 1);
	}

	function selectWeek({ week }: { week: WeekRangeCell }) {
		if (disabled) return;

		placeholder = week.start;
		hoveredWeek = null;

		if (selectedAnchorWeek === null || value?.end) {
			value = { end: undefined, start: week.start };
			return;
		}

		value = createWeekRange({
			anchor: selectedAnchorWeek,
			target: week
		});
	}

	function showPreview({ week }: { week: WeekRangeCell }) {
		if (disabled || selectedAnchorWeek === null || value?.end) return;
		hoveredWeek = week;
	}

	function hidePreview() {
		hoveredWeek = null;
	}

	function getWeekButtonClass({ week }: { week: WeekRangeCell }) {
		return cn(
			buttonVariants({ variant: 'ghost' }),
			'flex size-(--cell-size) items-center justify-center p-0 text-xs leading-none font-normal whitespace-nowrap select-none',
			'hover:bg-accent/80 hover:text-accent-foreground',
			'data-[range-middle]:rounded-none data-[range-middle]:bg-transparent data-[range-middle]:text-foreground',
			'data-[range-start]:bg-primary data-[range-start]:text-primary-foreground dark:data-[range-start]:hover:bg-accent [&[data-range-start]:hover]:!text-white',
			'data-[range-end]:bg-primary data-[range-end]:text-primary-foreground dark:data-[range-end]:hover:bg-accent [&[data-range-end]:hover]:!text-white',
			'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
			'focus:border-ring focus:ring-ring/50 focus:relative',
			week.inYear ? '' : 'text-muted-foreground hover:text-accent-foreground'
		);
	}
</script>

<RangeCalendarPrimitive.Root
	bind:ref
	bind:value
	bind:placeholder
	{disabled}
	{locale}
	class={cn(
		'bg-background group/calendar p-3 [--cell-size:--spacing(8)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent',
		className
	)}
	{...restProps}
>
	{#snippet children()}
		<RangeCalendar.Months class="w-fit md:flex-col">
			<RangeCalendar.Month class="w-fit">
				<RangeCalendar.Header>
					<RangeCalendar.Nav>
						<button
							type="button"
							class={cn(
								buttonVariants({ variant: 'ghost' }),
								'size-(--cell-size) bg-transparent p-0 select-none disabled:opacity-50'
							)}
							aria-label="Vorherige Seite"
							onclick={() => movePage({ direction: -1 })}
						>
							<ChevronLeft class="size-4" />
						</button>
						<button
							type="button"
							class={cn(
								buttonVariants({ variant: 'ghost' }),
								'size-(--cell-size) bg-transparent p-0 select-none disabled:opacity-50'
							)}
							aria-label="Nächste Seite"
							onclick={() => movePage({ direction: 1 })}
						>
							<ChevronRight class="size-4" />
						</button>
					</RangeCalendar.Nav>
					<div class="px-(--cell-size) text-center">
						<h2 class="text-sm font-medium whitespace-nowrap">
							Halbjahr {visibleHalf} {visibleYear}
						</h2>
						<p class="text-muted-foreground text-xs whitespace-nowrap">
							{selectedRangeLabel}
						</p>
					</div>
				</RangeCalendar.Header>

				<RangeCalendar.Grid>
					<RangeCalendar.GridHead>
						<RangeCalendar.GridRow class="w-full gap-x-1">
							{#each currentPage.months as month (month.month)}
								<RangeCalendar.HeadCell>{month.label}</RangeCalendar.HeadCell>
							{/each}
						</RangeCalendar.GridRow>
					</RangeCalendar.GridHead>
					<RangeCalendar.GridBody class={cn(
		'[&>tr:first-child>td[data-range-middle]]:rounded-t-md',
		'[&>tr:last-child>td[data-range-middle]]:rounded-b-md'
	)}>
						{#each Array.from({ length: maxRows }) as _, rowIndex (`row-${rowIndex}`)}
							<RangeCalendar.GridRow class="w-full gap-x-1">
								{#each currentPage.months as month (month.month)}
									{@const week = month.weeks[rowIndex] ?? null}
									{@const range = displayRange}
									{@const selected = week && range ? isWeekInRange({ range, week }) : false}
									{@const rangeStart =
										week && range ? week.start.compare(range.start) === 0 : false}
									{@const rangeEnd =
										week && range ? week.end.compare(range.end) === 0 : false}
									{@const rangeMiddle = selected && !rangeStart && !rangeEnd}
									{@const dataAttributes = !(week && range) ? {} : {
										'data-selected': selected ? '' : undefined,
										'data-range-start': rangeStart ? '' : undefined,
										'data-range-end': rangeEnd ? '' : undefined,
										'data-range-middle': rangeMiddle ? '' : undefined
									}}
									{#if week}
										<RangeCalendarPrimitive.Cell
											date={week.start as DateValue}
											month={week.start as DateValue}
											class={cn(
												'dark:[&:has([data-range-start])]:hover:bg-accent dark:[&:has([data-range-end])]:hover:bg-accent [&:has([data-range-middle])]:bg-accent dark:[&:has([data-range-middle])]:hover:bg-accent/50 [&:has([data-selected])]:bg-accent relative',
												'size-(--cell-size) p-0 text-center text-sm focus-within:z-20 data-range-middle:rounded-b-md [&:has([data-range-end])]:rounded-b-md [&:has([data-range-middle])]:rounded-none first:[&:has([data-range-middle])]:rounded-t-md',
												'last:[&:has([data-range-middle])]:rounded-b-md [&:has([data-range-start])]:rounded-t-md [&:last-child[data-selected]_[data-bits-day]]:rounded-b-md',
												className
											)}
											{...dataAttributes}
										>
											<button
												type="button"
												class={getWeekButtonClass({ week })}
												data-bits-day
												onmouseenter={() => showPreview({ week })}
												onmouseleave={hidePreview}
												onfocus={() => showPreview({ week })}
												onblur={hidePreview}
												onclick={() => selectWeek({ week })}
												{...dataAttributes}
												title={`${week.label}: ${week.start.toString()} bis ${week.end.toString()}`}
											>
												{week.label.replace('KW ', '')}
											</button>
										</RangeCalendarPrimitive.Cell>
									{:else}
										<span class="size-(--cell-size)" aria-hidden="true"></span>
									{/if}
								{/each}
							</RangeCalendar.GridRow>
						{/each}
					</RangeCalendar.GridBody>
				</RangeCalendar.Grid>
			</RangeCalendar.Month>
		</RangeCalendar.Months>
	{/snippet}
</RangeCalendarPrimitive.Root>

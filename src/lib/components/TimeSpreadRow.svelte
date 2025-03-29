<script lang="ts">
	import { DateFormatter, today } from '@internationalized/date';
	import { RangeCalendar } from '$lib/components/ui/range-calendar/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { CalendarIcon } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { buttonVariants } from './ui/button';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { DateRange } from 'bits-ui';
	import type { IncuriaDateRange } from '$lib/types';

	let {
		daterange,
		hours,
		setData
	}: {
		daterange?: DateRange;
		hours?: number;
		setData: (data: { daterange?: IncuriaDateRange; hours?: number }) => void;
	} = $props();

	const df = new DateFormatter('de-DE', {
		dateStyle: 'short'
	});

	let dateValue = $state<IncuriaDateRange>(
		daterange ?? { start: undefined, end: today('Europe/Berlin') }
	);

	let hoursValue = $state<number>(hours ?? 0);

	$effect(() => {
		setData({ daterange: dateValue, hours: hoursValue });
	});

	let label = $derived.by(() => {
		if (!dateValue) return 'Datumbereich wählen';
		const start = dateValue.start ? df.format(dateValue.start.toDate('Europe/Berlin')) : 'TT.MM.JJ';
		const end = dateValue.end ? df.format(dateValue.end.toDate('Europe/Berlin')) : 'TT.MM.JJ';
		return `${start} bis ${end}`;
	});
</script>

<Popover.Root>
	<Popover.Trigger
		class={cn(
			buttonVariants({
				variant: 'outline',
				class: 'basis-3/4 justify-start text-left font-normal'
			}),
			!dateValue && 'text-muted-foreground'
		)}
	>
		<CalendarIcon />
		{label}
	</Popover.Trigger>
	<Popover.Content class="w-auto p-0">
		<RangeCalendar bind:value={dateValue} class="w-fit" />
	</Popover.Content>
</Popover.Root>
<Input bind:value={hoursValue} class="w-full basis-1/4" type="number" placeholder="0 Stunden" />

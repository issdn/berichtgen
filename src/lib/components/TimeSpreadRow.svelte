<script lang="ts">
	import { DateFormatter } from '@internationalized/date';
	import { RangeCalendar } from '$lib/components/ui/range-calendar/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { CalendarIcon } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { buttonVariants } from './ui/button';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { DateRangeSchema } from './time_spread_schematic';
	import type { SuperForm, SuperFormData } from 'sveltekit-superforms/client';
	import * as Form from '$lib/components/ui/form/index.js';

	let {
		form,
		formData,
		index
	}: {
		form: SuperForm<DateRangeSchema>;
		formData: SuperFormData<DateRangeSchema>;
		index: number;
	} = $props();

	const df = new DateFormatter('de-DE', {
		dateStyle: 'short'
	});

	let label = $derived.by(() => {
		if (!$formData.values[index].daterange) return 'Datumbereich wählen';
		const start = $formData.values[index].daterange.start
			? df.format($formData.values[index].daterange.start.toDate('Europe/Berlin'))
			: 'TT.MM.JJ';
		const end = $formData.values[index].daterange.end
			? df.format($formData.values[index].daterange.end.toDate('Europe/Berlin'))
			: 'TT.MM.JJ';
		return `${start} bis ${end}`;
	});
</script>

<Form.Field
	class="basis-3/4 justify-start text-left font-normal"
	{form}
	name={`values[${index}].daterange`}
>
	<Form.Control>
		{#snippet children({ props })}
			<Popover.Root>
				<Popover.Trigger
					class={cn(
						buttonVariants({
							variant: 'outline',
							class: 'w-full'
						})
					)}
				>
					<CalendarIcon />
					{label}
				</Popover.Trigger>
				<Popover.Content class="w-auto p-0">
					<RangeCalendar bind:value={$formData.values[index].daterange} class="w-fit" />
				</Popover.Content>
			</Popover.Root>
		{/snippet}
	</Form.Control>
	<Form.FieldErrors />
</Form.Field>
<Form.Field {form} name={`values[${index}].hours`} class="w-full basis-1/4">
	<Form.Control>
		{#snippet children({ props })}
			<Input
				{...props}
				bind:value={$formData.values[index].hours}
				type="number"
				placeholder="0 Stunden"
				class="w-full"
			/>
		{/snippet}
	</Form.Control>
	<Form.FieldErrors />
</Form.Field>

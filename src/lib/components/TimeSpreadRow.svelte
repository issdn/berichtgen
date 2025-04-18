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
	import LocationCombobox from '$lib/components/LocationCombobox.svelte';

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

<div class="flex flex-col px-2">
	<div class="flex flex-row gap-x-4">
		<div>
			<p class="text-left font-normal">Stunden</p>
			<Form.Field {form} name={`values[${index}].hours`} class="w-full">
				<Form.Control>
					{#snippet children({ props })}
						<Input
							min={1}
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
		</div>
		<div>
			<p class="text-left font-normal">Ort</p>
			<Form.Field {form} name={`values[${index}].location`} class="w-calendar">
				<Form.Control>
					{#snippet children({ props })}
						<LocationCombobox bind:value={$formData.values[index].location} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
		</div>
	</div>
	<Form.Field
		class="col-span-2 justify-start text-left font-normal"
		{form}
		name={`values[${index}].daterange`}
	>
		<div class="flex flex-row items-center justify-between gap-x-2">
			<p class="text-left font-normal">Datumsbereich</p>
			<Form.Control>
				{#snippet children({ props })}
					<Popover.Root>
						<Popover.Trigger
							class={cn(
								buttonVariants({
									variant: 'outline',
									class: 'w-calendar'
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
		</div>
		<Form.FieldErrors />
	</Form.Field>
</div>

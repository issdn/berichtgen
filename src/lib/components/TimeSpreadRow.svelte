<script lang="ts">
	import { DateFormatter } from '@internationalized/date';
	import { RangeCalendar } from '$lib/components/ui/range-calendar/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { CalendarIcon } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import { buttonVariants } from './ui/button';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { SuperForm, SuperFormData } from 'sveltekit-superforms/client';
	import * as Form from '$lib/components/ui/form/index.js';
	import type { DateRangeSchema } from '$src/lib/schemas';

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
		if (!$formData.ranges[index].daterange) return 'Datumbereich wählen';
		const start = $formData.ranges[index].daterange.start
			? df.format($formData.ranges[index].daterange.start.toDate('Europe/Berlin'))
			: 'TT.MM.JJ';
		const end = $formData.ranges[index].daterange.end
			? df.format($formData.ranges[index].daterange.end.toDate('Europe/Berlin'))
			: 'TT.MM.JJ';
		return `${start} bis ${end}`;
	});
</script>

<div class="flex flex-col">
	<div class="flex flex-row gap-x-4">
		<Form.Field {form} name={`ranges[${index}].hours`} class="w-full">
			<div>
				<p class="text-left font-normal">Stunden (pro Woche)</p>
				<Form.Control>
					{#snippet children({ props })}
						<Input
							min={1}
							{...props}
							bind:value={$formData.ranges[index].hours}
							type="number"
							placeholder="0 Stunden"
							class="w-full"
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</div>
		</Form.Field>
		<Form.Field
			class="col-span-2 justify-start text-left font-normal"
			{form}
			name={`ranges[${index}].daterange`}
		>
			<div>
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
								<RangeCalendar
									locale="de-DE"
									bind:value={$formData.ranges[index].daterange}
									class="w-fit"
								/>
							</Popover.Content>
						</Popover.Root>
					{/snippet}
				</Form.Control>
			</div>
			<Form.FieldErrors />
		</Form.Field>
	</div>
</div>

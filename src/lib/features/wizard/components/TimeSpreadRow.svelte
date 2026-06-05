<script lang="ts">
	import type { DateRangeSchema } from '$wizard/schemas';
	import type { SuperForm } from 'sveltekit-superforms';
	import type { SuperFormData } from 'sveltekit-superforms/client';

	import { Input } from '$lib/components/ui/input/index.js';
	import { WeekRangeCalendar } from '$lib/components/ui/week-range-calendar/index.js';
	import { LOCALE, TIMEZONE } from '$lib/constants';
	import { dateFormatter } from '$lib/utils';
	import { buttonVariants } from '$ui/button';
	import * as Form from '$ui/form';
	import * as Popover from '$ui/popover';
	import { CalendarIcon } from '@lucide/svelte';
	import { cn } from 'tailwind-variants';

	let {
		form,
		formData,
		index
	}: {
		form: SuperForm<DateRangeSchema>;
		formData: SuperFormData<DateRangeSchema>;
		index: number;
	} = $props();

	let label = $derived.by(() => {
		if (!$formData.ranges[index].daterange) return 'Datumbereich wählen';
		const start = $formData.ranges[index].daterange.start
			? dateFormatter.format(
					$formData.ranges[index].daterange.start.toDate(TIMEZONE)
				)
			: 'TT.MM.JJ';
		const end = $formData.ranges[index].daterange.end
			? dateFormatter.format(
					$formData.ranges[index].daterange.end.toDate(TIMEZONE)
				)
			: 'TT.MM.JJ';
		return `${start} bis ${end}`;
	});
</script>

<div class="flex flex-col">
	<div class="flex flex-row gap-x-4">
		<Form.Field {form} name={`ranges[${index}].stunden`} class="w-full">
			<div>
				<p class="text-left font-normal">Stunden (pro Woche)</p>
				<Form.Control>
					{#snippet children({ props: inputProps })}
						<Input
							min={1}
							{...inputProps}
							bind:value={$formData.ranges[index].stunden as unknown as string}
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
				<p class="text-left font-normal">Kalenderwoche(n)</p>
				<Form.Control>
					<Popover.Root>
						<Popover.Trigger
							data-testid="date-range-trigger"
							class={cn(
								buttonVariants({
									class: 'w-calendar',
									variant: 'outline'
								})
							)}
						>
							<CalendarIcon />
							{label}
						</Popover.Trigger>
						<Popover.Content class="w-auto p-0">
							<WeekRangeCalendar
								locale={LOCALE}
								bind:value={$formData.ranges[index].daterange}
								class="w-fit"
							/>
						</Popover.Content>
					</Popover.Root>
				</Form.Control>
			</div>
			<Form.FieldErrors />
		</Form.Field>
	</div>
</div>

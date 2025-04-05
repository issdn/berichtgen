<script lang="ts">
	import TimeSpreadRow from './TimeSpreadRow.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { parseDate, today, type DateValue } from '@internationalized/date';
	import { Calendar } from 'lucide-svelte';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { dateRangeSchema, type DateRangeSchema } from './time_spread_schematic';
	import { buttonVariants } from './ui/button';
	import { slide } from 'svelte/transition';
	import { zod } from 'sveltekit-superforms/adapters';

	let {
		onClose,
		onValidChange,
		id
	}: { onClose: () => void; onValidChange: (data: DateRangeSchema['values']) => void; id: string } =
		$props();

	function newRow(id: number) {
		return {
			id,
			daterange: { start: undefined, end: today('Europe/Berlin') as DateValue }
		};
	}

	// End date is today by default. Is there no start date, then it is invalid.
	// If the daterange is valid then preemptively create next one so that the user doesn't have to click anything.
	const { form, errors, enhance, validateForm, ...rest } = superForm(
		defaults({ values: [newRow(0)] }, zod(dateRangeSchema)),
		{
			id,
			SPA: true,
			dataType: 'json',
			validators: zodClient(dateRangeSchema),
			async onChange() {
				const { valid } = await validateForm();
				if (valid) {
					onValidChange($form.values);
					$form.values = [...$form.values, newRow($form.values.length)];
				}
			}
		}
	);

	validateForm({ update: true });
</script>

<Dialog.Root
	onOpenChange={(isOpen) => {
		if (isOpen === false) onClose();
	}}
>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}><Calendar /></Dialog.Trigger>
	<Dialog.Content class="w-full">
		<Dialog.Header>
			<Dialog.Title>Wähle Datumbereiche!</Dialog.Title>
			<Dialog.Description
				>Der letzte (ungefüllte) Eintrag wird nicht übernommen 😉</Dialog.Description
			>
		</Dialog.Header>
		<div class="flex w-full flex-col gap-y-2">
			<div class="flex w-full flex-row gap-x-4">
				<span class="basis-3/4 px-1 font-medium text-muted-foreground">Datumsbereich</span>
				<span class="basis-1/4 px-1 font-medium text-muted-foreground">Stunden</span>
			</div>
			<div class="flex w-full flex-col gap-y-2">
				<form method="POST" use:enhance>
					{#each $form.values as _, index}
						<div transition:slide class="flex w-full flex-row gap-x-4">
							<TimeSpreadRow
								{index}
								formData={form}
								form={{ form, errors, enhance, validateForm, ...rest }}
							/>
						</div>
					{/each}
				</form>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

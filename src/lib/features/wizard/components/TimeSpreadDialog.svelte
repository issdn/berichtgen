<script lang="ts">
	import { Button } from '$ui/button';
	import * as Dialog from '$ui/dialog';
	import * as Form from '$ui/form';
	import { Separator } from '$ui/separator';
	import { Ort } from '$wizard/enums';
	import { dateRangeSchema, type DateRangeSchema } from '$wizard/schemas';
	import { type DateValue, today } from '@internationalized/date';
	import { Calendar, Trash2 } from '@lucide/svelte';
	import { slide } from 'svelte/transition';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4, zod4Client } from 'sveltekit-superforms/adapters';

	import LocationCombobox from './LocationCombobox.svelte';
	import TimeSpreadRow from './TimeSpreadRow.svelte';

	let {
		id,
		onClose,
		onValidChange
	}: {
		id: string;
		onClose: () => void;
		onValidChange: (data: DateRangeSchema) => void;
	} = $props();

	function newRow(id: number) {
		return {
			daterange: { end: today('Europe/Berlin') as DateValue, start: undefined },
			id
		};
	}

	// End date is today by default. Is there no start date, then it is invalid.
	// If the daterange is valid then preemptively create next one so that the user doesn't have to click anything.
	const { enhance, errors, form, validateForm, ...rest } = superForm(
		defaults({ ort: Ort.SCHULE, ranges: [newRow(0)] }, zod4(dateRangeSchema)),
		{
			dataType: 'json',
			id,
			async onChange() {
				const { valid } = await validateForm();
				if (valid) {
					onValidChange({ ...$form });
					$form.ranges = [...$form.ranges, newRow($form.ranges.length)];
				}
			},
			SPA: true,
			validators: zod4Client(dateRangeSchema)
		}
	);

	validateForm({ update: true });

	function removeRow(index: number) {
		$form.ranges = $form.ranges.filter((_, i) => i !== index);
	}
</script>

<Dialog.Root
	onOpenChange={(isOpen) => {
		if (isOpen === false) onClose();
	}}
>
	<Dialog.Trigger data-testid="time-spread-trigger"
		><Button class="animate-breathing-shadow" variant="default"
			><Calendar /></Button
		></Dialog.Trigger
	>
	<Dialog.Content data-testid="time-spread-dialog" class="w-full px-4">
		<Dialog.Header class="px-2">
			<Dialog.Title>Wähle Datumbereiche!</Dialog.Title>
			<Dialog.Description
				>Der letzte (ungefüllte) Eintrag wird nicht übernommen 😉</Dialog.Description
			>
		</Dialog.Header>
		<form method="POST" use:enhance>
			<div class="max-h-150 w-full gap-y-8 overflow-y-auto pt-8">
				<div
					class="mb-6 flex w-full flex-row items-center justify-between gap-x-4"
				>
					<p class="w-full pl-1 text-left align-middle font-normal">Ort</p>
					<Form.Field
						form={{ enhance, errors, form, validateForm, ...rest }}
						name="ort"
						class="w-calendar space-y-0"
					>
						<Form.Control>
							<LocationCombobox bind:value={$form.ort} />
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>
				<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
				{#each $form.ranges as _, index (index)}
					{#if index > 0}
						<div class="relative flex h-16 flex-row items-center">
							<Separator />
							{#if index < $form.ranges.length - 1}
								<Button
									variant="outline"
									class="absolute top-1/2 right-4 -translate-y-1/2"
									onclick={() => removeRow(index)}
								>
									<Trash2 />
								</Button>
							{/if}
						</div>
					{/if}
					<div transition:slide class="flex w-full flex-row gap-x-4">
						<TimeSpreadRow
							{index}
							formData={form}
							form={{ enhance, errors, form, validateForm, ...rest }}
						/>
					</div>
				{/each}
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

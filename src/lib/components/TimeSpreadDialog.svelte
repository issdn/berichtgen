<script lang="ts">
	import TimeSpreadRow from './TimeSpreadRow.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { today, type DateValue } from '@internationalized/date';
	import { Calendar, Trash2 } from '@lucide/svelte';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { buttonVariants } from './ui/button';
	import { slide } from 'svelte/transition';
	import { zod } from 'sveltekit-superforms/adapters';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Ort } from '$src/lib/enums';
	import * as Form from '$lib/components/ui/form/index.js';
	import LocationCombobox from '$lib/components/LocationCombobox.svelte';
	import { dateRangeSchema, type DateRangeSchema } from '$src/lib/schemas';

	let {
		onClose,
		onValidChange,
		id
	}: { onClose: () => void; onValidChange: (data: DateRangeSchema) => void; id: string } = $props();

	function newRow(id: number) {
		return {
			id,
			daterange: { start: undefined, end: today('Europe/Berlin') as DateValue }
		};
	}

	// End date is today by default. Is there no start date, then it is invalid.
	// If the daterange is valid then preemptively create next one so that the user doesn't have to click anything.
	const { form, errors, enhance, validateForm, ...rest } = superForm(
		defaults({ ranges: [newRow(0)], ort: Ort.SCHULE }, zod(dateRangeSchema)),
		{
			id,
			SPA: true,
			dataType: 'json',
			validators: zodClient(dateRangeSchema),
			async onChange() {
				const { valid } = await validateForm();
				if (valid) {
					onValidChange({ ...$form });
					$form.ranges = [...$form.ranges, newRow($form.ranges.length)];
				}
			}
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
	<Dialog.Trigger
		><Button class="animate-breathing-shadow" variant="default"><Calendar /></Button
		></Dialog.Trigger
	>
	<Dialog.Content class="w-full px-4">
		<Dialog.Header class="px-2">
			<Dialog.Title>Wähle Datumbereiche!</Dialog.Title>
			<Dialog.Description
				>Der letzte (ungefüllte) Eintrag wird nicht übernommen 😉</Dialog.Description
			>
		</Dialog.Header>
		<form method="POST" use:enhance>
			<div class="max-h-[600px] w-full gap-y-8 overflow-y-auto pt-8">
				<div class="mb-6 flex w-full flex-row items-center justify-between gap-x-4">
					<p class="w-full pl-1 text-left align-middle font-normal">Ort</p>
					<Form.Field
						form={{ form, errors, enhance, validateForm, ...rest }}
						name="ort"
						class="w-calendar space-y-0"
					>
						<Form.Control>
							{#snippet children({ props })}
								<LocationCombobox bind:value={$form.ort} />
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>
				{#each $form.ranges as _, index}
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
							form={{ form, errors, enhance, validateForm, ...rest }}
						/>
					</div>
				{/each}
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

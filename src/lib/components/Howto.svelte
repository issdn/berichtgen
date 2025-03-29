<script lang="ts">
	import TimeSpreadRow from './TimeSpreadRow.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import type { DateRange } from 'bits-ui';
	import type { IncuriaDateRange } from '$lib/types';
	import { Clock } from 'lucide-svelte';

	let { data = $bindable([{}]) }: { data: { daterange?: DateRange; hours?: number }[] } = $props();

	// End date is today by default. Is there no start date, then it is invalid.
	// If the daterange is valid then preemptively create next one so that the user doesn't have to click anything.
	function handleAddDateRange(
		newRow: { daterange?: IncuriaDateRange; hours?: number },
		rowIndex: number
	) {
		const newData = data.map((row, i) => (i === rowIndex ? newRow : row));
		if (newData.at(-1)!.daterange?.start != undefined) {
			newData.push({});
			data = newData;
		}
	}
</script>

<Dialog.Root open={true}>
	<Dialog.Trigger><Clock /></Dialog.Trigger>
	<Dialog.Content class="w-full">
		<Dialog.Header>
			<Dialog.Title>Wähle Datumbereiche in den sich die Unterrichten befiden.</Dialog.Title>
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
				{#each data as row, i}
					<div class="flex w-full flex-row gap-x-4">
						<TimeSpreadRow {...row} setData={(row) => handleAddDateRange(row, i)} />
					</div>
				{/each}
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

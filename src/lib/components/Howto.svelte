<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { getLocalTimeZone, today } from '@internationalized/date';
	import { RangeCalendar } from '$lib/components/ui/range-calendar/index.js';

	const start = today(getLocalTimeZone());
	const end = start.add({ days: 7 });

	let value = $state({
		start,
		end
	});
</script>

<Dialog.Root open={true}>
	<Dialog.Trigger>Open</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Wähle das Datum in dem</Dialog.Title>
			<Dialog.Description>
				This action cannot be undone. This will permanently delete your account and remove your data
				from our servers.
			</Dialog.Description>
		</Dialog.Header>
		<RangeCalendar bind:value class="rounded-md border" />
	</Dialog.Content>
</Dialog.Root>

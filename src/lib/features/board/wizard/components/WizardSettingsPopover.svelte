<script lang="ts">
	import type { UserContext } from '$auth/types';
	import { berichtgenStore } from '$lib/stores/berichtgen.svelte';
	import LabeledSwitch from '$ui/LabeledSwitch.svelte';
	import { Settings } from '@lucide/svelte';
	import { getContext } from 'svelte';
	import * as Popover from '$ui/popover';
	import * as Tooltip from '$ui/tooltip';
	import { Separator } from '$ui/separator';

	let getUser = getContext<UserContext>('user');

	let { loggedIn } = $derived(getUser());
</script>

<Popover.Root>
	<Popover.Trigger><Settings /></Popover.Trigger>
	<Popover.Content>
		<Tooltip.Provider ignoreNonKeyboardFocus>
			<div class="flex flex-col gap-y-4">
				<h4 class="leading-none font-medium">Wizard Einstellungen</h4>
				<Separator />
				{#if loggedIn}
					<LabeledSwitch
						bind:checked={berichtgenStore.processPhotos}
						id="terms-switch"
						label="Bilder verarbeiten"
						description="Die Bilder aus Word/PDF Dateien extrahieren und mit einem Text ML Model lesen."
					/>
					<LabeledSwitch
						bind:checked={berichtgenStore.rewordJSON}
						id="reword-json-switch"
						label="JSON-Dateien umformulieren"
						description="Du kannst schon vorhandene JSON-Dateien mit dem ***REMOVED***-Format datieren lassen. Aktiviere diese Option, um die JSON-Dateien wie alle andere doch umzuschreiben."
					/>
				{/if}
				<LabeledSwitch
					bind:checked={berichtgenStore.constantHours}
					id="constant-stunden-switch"
					label="Feste Arbeitsstunden"
					description="Pro Woche werden 40 Stunden angenommen."
				/>
			</div>
		</Tooltip.Provider>
	</Popover.Content>
</Popover.Root>

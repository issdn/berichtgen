<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import { wizardScheduler } from '$src/lib/wizard_scheduler.svelte';
	import { Settings } from '@lucide/svelte';
	import Separator from '$src/lib/components/ui/separator/separator.svelte';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { getContext } from 'svelte';
	import type { UserContext } from '$src/lib/types';

	let { loggedIn } = getContext<UserContext>('user')();
</script>

<Popover.Root>
	<Popover.Trigger><Settings /></Popover.Trigger>
	<Popover.Content>
		<div class="flex flex-col gap-y-4">
			<h4 class="leading-none font-medium">Wizard Einstellungen</h4>
			<Separator />
			{#if loggedIn}
				<div class="flex items-center space-x-2">
					<Switch
						bind:checked={berichtgenStore.processPhotos}
						id="terms-label"
						disabled={wizardScheduler.isRunning}
					/>

					<Label
						for="terms-label"
						class="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
					>
						Bilder verarbeiten
					</Label>
				</div>
			{/if}
			<div class="flex items-center space-x-2">
				<Switch
					bind:checked={berichtgenStore.rewordJSON}
					id="reword-json-label"
					disabled={wizardScheduler.isRunning}
				/>

				<Label
					for="reword-json-label"
					class="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>
					JSON-Dateien umformulieren
				</Label>
			</div>
		</div>
	</Popover.Content>
</Popover.Root>

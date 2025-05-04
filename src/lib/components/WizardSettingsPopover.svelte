<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { incuriaStore } from '$lib/stores/board.svelte';
	import { wizardScheduler } from '$src/lib/wizard_scheduler.svelte';
	import { Settings } from 'lucide-svelte';
	import Separator from '$src/lib/components/ui/separator/separator.svelte';
	import { Switch } from '$lib/components/ui/switch/index.js';
</script>

<Popover.Root>
	<Popover.Trigger><Settings /></Popover.Trigger>
	<Popover.Content>
		<div class="flex flex-col gap-y-4">
			<h4 class="font-medium leading-none">Wizard Einstellungen</h4>
			<Separator />
			<div class="flex items-center space-x-2">
				<Switch
					bind:checked={incuriaStore.processPhotos}
					id="terms-label"
					disabled={wizardScheduler.isRunning}
				/>

				<Label
					for="terms-label"
					class="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>
					Bilder verarbeiten
				</Label>
			</div>
			<div class="flex items-center space-x-2">
				<Switch
					bind:checked={incuriaStore.rewordJSON}
					id="reword-json-label"
					disabled={wizardScheduler.isRunning}
				/>

				<Label
					for="reword-json-label"
					class="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>
					JSON-Dateien umformulieren
				</Label>
			</div>
		</div>
	</Popover.Content>
</Popover.Root>

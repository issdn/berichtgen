<script lang="ts">
	import { Label } from '$lib/components/ui/label/index.js';
	import { wizardScheduler } from '$src/lib/wizard_scheduler.svelte';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

	let { label, id, description, checked = $bindable(false) } = $props();
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		<div class="flex items-center space-x-2">
			<Switch bind:checked {id} disabled={wizardScheduler.isRunning} />
			<Label
				for={id}
				class="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
			>
				{label}
			</Label>
		</div>
	</Tooltip.Trigger>
	<Tooltip.Content>
		<p class="max-w-96">{description}</p>
	</Tooltip.Content>
</Tooltip.Root>

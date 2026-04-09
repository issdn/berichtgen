<script lang="ts">
	import { Button } from '$ui/button';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Check, ChevronsUpDown } from '@lucide/svelte';
	import { tick } from 'svelte';
	import { cn } from 'tailwind-variants';

	let { value = $bindable() } = $props();

	const locations = [
		{
			value: 'SCHULE'
		},
		{
			value: 'BETRIEB'
		},
		{
			value: 'UNTERWEISUNG'
		},
		{
			value: 'SCHULE/BETRIEB'
		}
	];

	let open = $state(false);

	let triggerRef = $state<HTMLButtonElement>(null!);

	// We want to refocus the trigger button when the user selects
	// an item from the list so users can continue navigating the
	// rest of the form with the keyboard.
	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => {
			triggerRef.focus();
		});
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger class="w-calendar justify-between" bind:ref={triggerRef}>
		{#snippet child({ props })}
			<Button variant="outline" {...props} role="combobox" aria-expanded={open}>
				{value}
				<ChevronsUpDown class="opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-calendar p-0">
		<Command.Root>
			<Command.List>
				<Command.Group>
					{#each locations as framework (framework.value)}
						<Command.Item
							value={framework.value}
							onSelect={() => {
								value = framework.value;
								closeAndFocusTrigger();
							}}
						>
							<Check
								class={cn(value !== framework.value && 'text-transparent')}
							/>
							{framework.value}
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>

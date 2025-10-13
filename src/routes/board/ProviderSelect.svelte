<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import { getContext, tick } from 'svelte';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import { ChevronDown, CircleAlert, CircleCheck } from '@lucide/svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';
	import { type UserBoardContext } from '$src/lib/types';

	let open = $state(false);
	let triggerRef = $state<HTMLButtonElement>(null!);

	let { providers } = getContext<UserBoardContext>('board')();

	const selectedValue = $derived(
		providers.find((f) => f.id === berichtgenStore.currentProvider?.id)?.name
	);

	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => {
			triggerRef.focus();
		});
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger bind:ref={triggerRef}>
		{#snippet child({ props })}
			<Button
				disabled={wizardScheduler.isRunning}
				variant="ghost"
				class="justify-between gap-x-2"
				{...props}
				role="combobox"
				aria-expanded={open}
			>
				{selectedValue || 'Modell auswählen...'}
				<ChevronDown class="ml-2 size-4 shrink-0 opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content align="start" class="w-[400px] p-0">
		<Command.Root>
			<Command.Input placeholder="Modell suchen..." />
			<Command.List>
				<Command.Empty>Kein Provider gefunden.</Command.Empty>
				<Command.Group>
					{#each providers as provider}
						<Command.Item
							class="px-4 py-3"
							value={provider.name}
							onSelect={() => {
								berichtgenStore.currentProvider = provider;
								closeAndFocusTrigger();
							}}
						>
							<Check
								class={cn(
									'mr-2 size-4',
									berichtgenStore.currentProvider.id !== provider.id && 'text-transparent'
								)}
							/>
							<div class="flex w-full flex-row items-center justify-between">
								{provider.name}
								<Tooltip.Provider>
									{#if provider.token === null}
										<Tooltip.Root>
											<Tooltip.Trigger class="[&_svg]:size-5">
												<CircleAlert />
											</Tooltip.Trigger>
											<Tooltip.Content>
												<p>Kein Token - normaler Token Verbrauch</p>
											</Tooltip.Content>
										</Tooltip.Root>
									{:else}
										<Tooltip.Root>
											<Tooltip.Trigger class="[&_svg]:size-5">
												<CircleCheck />
											</Tooltip.Trigger>
											<Tooltip.Content>
												<p>Beim korrekten API-Key werden 75% Tokens weniger verbraucht</p>
											</Tooltip.Content>
										</Tooltip.Root>
									{/if}
								</Tooltip.Provider>
							</div>
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>

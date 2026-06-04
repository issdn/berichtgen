<script lang="ts">
	import { page } from '$app/state';
	import berichtgenStore from '$core/stores/berichtgen.svelte';
	import LabeledSwitch from '$ui/LabeledSwitch.svelte';
	import * as Popover from '$ui/popover';
	import { Separator } from '$ui/separator';
	import * as Tooltip from '$ui/tooltip';
	import { wizardMediatorContext } from '$wizard/services/wizard_mediator.svelte';
	import { Settings } from '@lucide/svelte';

	const wizardMediator = wizardMediatorContext.get();

	type BooleanSettingKey = {
		[K in keyof App.BerichtgenSettings]: App.BerichtgenSettings[K] extends boolean
			? K
			: never;
	}[keyof App.BerichtgenSettings];

	let canChangeRewordJSON = $derived.by(() => {
		if (!wizardMediator.filesStates) return true;
		const { batch_pending, completion } = wizardMediator.filesStates;
		return batch_pending + completion === 0;
	});
</script>

<Popover.Root>
	<Popover.Trigger><Settings /></Popover.Trigger>
	<Popover.Content>
		<Tooltip.Provider ignoreNonKeyboardFocus>
			<div class="flex flex-col gap-y-4">
				<h4 class="leading-none font-medium">Wizard Einstellungen</h4>
				<Separator />
				{#if page.data.loggedIn}
					{@render settingSwitch(
						'rewordJSON',
						'reword-json-switch',
						'JSON-Dateien umformulieren',
						'Du kannst schon vorhandene JSON-Dateien mit dem Berichtgen-Format datieren lassen. Aktiviere diese Option, um die JSON-Dateien wie alle andere doch umzuschreiben.',
						!canChangeRewordJSON
					)}
				{/if}
				{@render settingSwitch(
					'constantHours',
					'constant-stunden-switch',
					'Feste Arbeitsstunden',
					'Pro Woche werden 40 Stunden angenommen.'
				)}
			</div>
		</Tooltip.Provider>
	</Popover.Content>
</Popover.Root>

{#snippet settingSwitch(
	key: BooleanSettingKey,
	id: string,
	label: string,
	description: string,
	disabled: boolean = false
)}
	<LabeledSwitch
		checked={berichtgenStore.get(key)}
		{disabled}
		onchange={(value) => berichtgenStore.set(key, value)}
		{id}
		{label}
		{description}
	/>
{/snippet}

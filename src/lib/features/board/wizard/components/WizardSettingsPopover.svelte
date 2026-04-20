<script lang="ts">
	import berichtgenStore from '$lib/stores/berichtgen.svelte';
	import LabeledSwitch from '$ui/LabeledSwitch.svelte';
	import { Settings } from '@lucide/svelte';
	import { dev } from '$app/environment';
	import * as Popover from '$ui/popover';
	import * as Tooltip from '$ui/tooltip';
	import { Separator } from '$ui/separator';
	import { page } from '$app/state';

	type BooleanSettingKey = {
		[K in keyof App.***REMOVED***Settings]: App.***REMOVED***Settings[K] extends boolean
			? K
			: never;
	}[keyof App.***REMOVED***Settings];
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
						'processPhotos',
						'terms-switch',
						'Bilder verarbeiten',
						'Die Bilder aus Word/PDF Dateien extrahieren und mit einem Text ML Model lesen.'
					)}
					{@render settingSwitch(
						'rewordJSON',
						'reword-json-switch',
						'JSON-Dateien umformulieren',
						'Du kannst schon vorhandene JSON-Dateien mit dem ***REMOVED***-Format datieren lassen. Aktiviere diese Option, um die JSON-Dateien wie alle andere doch umzuschreiben.'
					)}
				{/if}
				{@render settingSwitch(
					'constantHours',
					'constant-stunden-switch',
					'Feste Arbeitsstunden',
					'Pro Woche werden 40 Stunden angenommen.'
				)}
				{#if dev}
					<Separator />
					{@render settingSwitch(
						'useDevEndpoint',
						'dev-endpoint-switch',
						'Dev-Endpoint',
						'Sendet Anfragen an /board/dev/completion (kein Token-Abzug, kein Vertex AI).'
					)}
				{/if}
			</div>
		</Tooltip.Provider>
	</Popover.Content>
</Popover.Root>

{#snippet settingSwitch(
	key: BooleanSettingKey,
	id: string,
	label: string,
	description: string
)}
	<LabeledSwitch
		checked={berichtgenStore.get(key)}
		onchange={(value) => berichtgenStore.set(key, value)}
		{id}
		{label}
		{description}
	/>
{/snippet}



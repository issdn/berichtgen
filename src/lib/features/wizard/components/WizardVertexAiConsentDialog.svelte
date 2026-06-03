<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';

	let {
		onAccept,
		open = $bindable(false),
		pending = false
	}: {
		onAccept: () => Promise<void> | void;
		open?: boolean;
		pending?: boolean;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Einwilligung zur Vertex-AI-Dateianalyse</Dialog.Title>
			<Dialog.Description>
				Für die Verarbeitung dieser Dateien werden Inhalte an Google Cloud
				Vertex AI übermittelt. Die Analyse startet erst nach deiner
				ausdrücklichen Einwilligung.
				<br />
				<br />
				Die Einwilligung wird protokolliert und kann später in den Einstellungen widerrufen
				werden.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="ghost" disabled={pending} onclick={() => (open = false)}>
				Abbrechen
			</Button>
			<Button
				data-testid="wizard-vertex-ai-consent-accept"
				disabled={pending}
				onclick={onAccept}
			>
				Einwilligen und ausführen
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

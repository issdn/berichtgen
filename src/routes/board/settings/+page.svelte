<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import ProviderInput from '$lib/components/settings/ProviderInput.svelte';

	const { data } = $props();

	const { providers } = data;
</script>

<div class="flex flex-row md:px-64">
	<Card.Root class="w-full">
		<Card.Header>
			<Card.Title>Deine LLM-Verpküpfungen</Card.Title>
			<Card.Description>Hier kannst du deine eigene API-Keys hinzufügen.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#each providers as provider}
				<ProviderInput {provider} />
			{/each}
		</Card.Content>
	</Card.Root>
</div>

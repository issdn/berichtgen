<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { BookText } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card/index.js';
</script>

<Tabs.Root value="dateien" class="flex flex-col">
	<div class="flex flex-row items-center gap-x-2 py-2">
		<div class="flex h-10 w-12 items-center justify-center rounded-md bg-muted">
			<BookText />
		</div>
		<Tabs.List>
			<Tabs.Trigger value="dateien">Dateien</Tabs.Trigger>
			<Tabs.Trigger value="schnittstellen">Schnittstellen</Tabs.Trigger>
		</Tabs.List>
	</div>
	<div class="rounded-lg bg-muted p-4">
		<Tabs.Content value="dateien" class="flex flex-col gap-y-4"
			>{@render renderHowToOwnJson()}</Tabs.Content
		>
		<Tabs.Content value="schnittstellen">TODO: How to use chrome extension</Tabs.Content>
	</div>
</Tabs.Root>

{#snippet renderHowToOwnJson()}
	<Card.Root>
		<Card.Header>
			<Card.Title>Berichte kostenlos generieren</Card.Title>
		</Card.Header>
		<Card.Content>
			<p>Du kannst deine Berichte kostenlos generieren in dem du die</p>
		</Card.Content>
		<Card.Footer>
			<p>Card Footer</p>
		</Card.Footer>
	</Card.Root>
{/snippet}

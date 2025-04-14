<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { BookOpenText } from 'lucide-svelte';
</script>

<Tabs.Root value="dateien" class="flex flex-col">
	<div class="flex flex-row items-center gap-x-2 py-2">
		<div class="flex h-10 w-12 items-center justify-center rounded-md bg-muted">
			<BookOpenText />
		</div>
		<Tabs.List>
			<Tabs.Trigger value="dateien">Dateien</Tabs.Trigger>
			<Tabs.Trigger value="schnittstellen">Schnittstellen</Tabs.Trigger>
		</Tabs.List>
	</div>
	<div class="rounded-lg bg-muted p-4">
		<Tabs.Content value="dateien">TODO: How to upload correct files</Tabs.Content>
		<Tabs.Content value="schnittstellen">TODO: How to use chrome extension</Tabs.Content>
	</div>
</Tabs.Root>

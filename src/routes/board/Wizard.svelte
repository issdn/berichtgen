<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { FileClock } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import { parseDOCX, parsePDF } from 'llm-berichtsheft-json';

	const { files }: { files: FileList | null } = $props();

	let text = $state<string[]>([]);
</script>

<Card.Root class="h-full w-full">
	<Card.Content class="h-full w-full flex-col gap-y-4">
		{#if files != null}
			<ol class="flex w-full flex-col gap-y-4">
				{#each files as file}
					<li transition:fly class="overflow-hidden truncate">{file.name}</li>
				{/each}
				{#if text.length > 0}
					{#each text as p}
						<span>{p}</span>
					{/each}
				{/if}
			</ol>
			<Button
				onclick={async () => {
					const stream = parseDOCX(new Uint8Array(await files.item(0)?.arrayBuffer()!));
					for await (const p of stream) {
						text = [...text, p];
					}
				}}>Verarbeiten</Button
			>
		{:else}
			<div class="flex h-full w-full flex-col items-center justify-center gap-y-4 text-secondary">
				<FileClock size={46} />
				<span>Droppe die Dateien in das Feld oben</span>
			</div>
		{/if}
	</Card.Content>
</Card.Root>

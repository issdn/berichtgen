<script lang="ts">
	import FileWizard from './FileWizard.svelte';

	const { files }: { files: FileList | null } = $props();

	let filesAsText = $state<string[]>([]);

	let filesReady = $state(0);

	$effect(() => {
		if (files !== null && filesReady === files.length) {
			$inspect(filesAsText);
		}
	});
</script>

{#if files != null}
	<div class="relative h-full w-full rounded-lg bg-secondary p-8">
		{#each files as file, i}
			<FileWizard
				onResult={(file) => {
					filesAsText = [...filesAsText, file];
					filesReady += 1;
				}}
				{file}
			/>
		{/each}
	</div>
{/if}

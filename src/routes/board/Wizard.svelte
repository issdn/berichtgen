<script lang="ts">
	import FileWizard from './FileWizard.svelte';
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';
</script>

<div class="relative h-full w-full rounded-lg bg-secondary p-8">
	{#if wizardScheduler.files != null}
		{#each wizardScheduler.files as file, i}
			{#if i <= wizardScheduler.filesReady + wizardScheduler.batchSize}
				<FileWizard {file}>
					{#snippet children({ step, message })}
						<span class="overflow-hidden truncate">{file.name} {step} {message}</span>
					{/snippet}
				</FileWizard>
			{:else}
				<span class="overflow-hidden truncate">{file.name}</span>
			{/if}
		{/each}
	{/if}
</div>

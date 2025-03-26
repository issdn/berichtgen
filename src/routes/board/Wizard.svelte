<script lang="ts">
	import FileWizard from './FileWizard.svelte';
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
</script>

<div class="relative h-full w-full rounded-lg bg-secondary p-8">
	{#if wizardScheduler.files != null}
		{#each wizardScheduler.files as file, i}
			{#if i <= wizardScheduler.filesReady + wizardScheduler.batchSize}
				<FileWizard {file}>
					{#snippet children({ step, message, value, max })}
						<div class="flex h-12 flex-row items-center gap-x-4 bg-background px-4">
							<span class="overflow-hidden truncate">{file.name} {step} {message}</span>
							<Progress {max} {value} />
						</div>
					{/snippet}
				</FileWizard>
			{:else}
				<span class="overflow-hidden truncate">{file.name}</span>
			{/if}
		{/each}
	{/if}
</div>

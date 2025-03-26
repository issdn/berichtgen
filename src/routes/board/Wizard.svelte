<script lang="ts">
	import FileWizard from './FileWizard.svelte';
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
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

{#if wizardScheduler.done === true}
	<Dialog.Root
		open={(wizardScheduler.done = true)}
		onOpenChange={(isOpen) => {
			if (isOpen === false) wizardScheduler.done = false;
		}}
	>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Are you sure absolutely sure?</Dialog.Title>
				<Dialog.Description>
					This action cannot be undone. This will permanently delete your account and remove your
					data from our servers.
				</Dialog.Description>
			</Dialog.Header>
		</Dialog.Content>
	</Dialog.Root>
{/if}

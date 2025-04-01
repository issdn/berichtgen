<script lang="ts">
	import WizardFile from './WizardFile.svelte';
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Download } from 'lucide-svelte';
	import { slide } from 'svelte/transition';
</script>

<div class="relative h-full w-full gap-y-8 rounded-lg border">
	<div
		class="flex flex-row items-center justify-between gap-x-4 bg-muted p-4 text-muted-foreground"
	>
		<div>
			{#if wizardScheduler.files === null}
				<p transition:slide>Es wird auf die Dateien gewartet.</p>
			{:else if (wizardScheduler.finished?.length ?? 0) === wizardScheduler.files.length}
				<p transition:slide>Fertig!</p>
			{:else}
				<p transition:slide>
					{wizardScheduler.finished?.length ?? 0}/{wizardScheduler.files.length}
				</p>
			{/if}
		</div>
		{#if wizardScheduler.result !== null}
			{#await wizardScheduler.result then result}
				<Button href={result} download="bericht.json"><Download />Herunterladen</Button>
			{/await}
		{:else}
			<Button disabled={true}><Download />Herunterladen</Button>
		{/if}
	</div>
	<div class="flex flex-col gap-y-1 p-1">
		{#if wizardScheduler.schedule !== null && wizardScheduler.processInit !== null}
			{#await wizardScheduler.processInit then}
				{#each wizardScheduler.schedule as { progress, machine }, i}
					{#if i <= wizardScheduler.filesReady + wizardScheduler.batchSize}
						<WizardFile {progress} {machine} />
					{:else}
						<span class="overflow-hidden truncate">{progress.file.name}</span>
					{/if}
				{/each}
			{/await}
		{/if}
	</div>
</div>

<script lang="ts">
	import { CircleCheck } from '@lucide/svelte';

	interface Props {
		/** Step labels in display order. */
		steps: string[];
		/** 1-based index of the currently active step. */
		currentStep: number;
	}

	const { steps, currentStep }: Props = $props();
</script>

<div class="flex items-center gap-x-3">
	{#each steps as label, i (label)}
		{@const stepNumber = i + 1}
		{@const isActive = currentStep === stepNumber}
		{@const isCompleted = currentStep > stepNumber}

		<!-- Step bubble + label -->
		<div class="flex items-center gap-x-2">
			<div
				class="flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold transition-colors
					{isActive
					? 'bg-primary text-primary-foreground'
					: isCompleted
						? 'bg-primary/20 text-primary'
						: 'bg-muted text-muted-foreground'}"
			>
				{#if isCompleted}
					<CircleCheck class="size-4" />
				{:else}
					{stepNumber}
				{/if}
			</div>
			<span class="text-sm font-medium {isActive ? 'text-foreground' : 'text-muted-foreground'}">
				{label}
			</span>
		</div>

		<!-- Connector line between steps (not after the last one) -->
		{#if stepNumber < steps.length}
			<div class="bg-border h-px w-8"></div>
		{/if}
	{/each}
</div>

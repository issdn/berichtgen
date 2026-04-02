<script lang="ts">
	import { CircleCheck } from '@lucide/svelte';
	import type { Component } from 'svelte';

	/** Configuration object for a single step. */
	export interface StepConfig {
		/** Display label shown beside the step indicator. */
		label: string;
		/**
		 * When true, the step bubble is visually dimmed and cannot be clicked.
		 * Defaults to false.
		 */
		disabled?: boolean;
		/**
		 * Optional Lucide-style icon component to render inside the bubble
		 * instead of the step number. Completed steps always show CircleCheck.
		 */
		icon?: Component<{ class?: string }>;
	}

	interface Props {
		/** Step configurations in display order. */
		steps: StepConfig[];
		/** 1-based index of the currently active step. */
		currentStep: number;
		/**
		 * Called when the user clicks a non-disabled step bubble.
		 * If omitted the stepper is display-only (no interaction).
		 */
		onStepClick?: (step: number) => void;
	}

	let {
		steps,
		currentStep = $bindable(),
		onStepClick = (s) => (currentStep = s as 1 | 2)
	}: Props = $props();
</script>

<div class="flex items-center gap-x-3">
	{#each steps as { label, disabled = false, icon: Icon }, i (label)}
		{@const stepNumber = i + 1}
		{@const isActive = currentStep === stepNumber}
		{@const isCompleted = currentStep > stepNumber}
		{@const isClickable = !!onStepClick && !disabled}

		<!-- Step bubble + label — entire row is the click target -->
		<button
			type="button"
			disabled={!isClickable}
			onclick={() => onStepClick?.(stepNumber)}
			class="flex items-center gap-x-2 rounded
				{isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
				{disabled ? 'opacity-40' : ''}"
		>
			<div
				class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors
					{isActive
					? 'bg-primary text-primary-foreground'
					: isCompleted
						? 'bg-primary/20 text-primary'
						: 'bg-muted text-muted-foreground'}"
			>
				{#if isCompleted}
					<CircleCheck class="size-4" />
				{:else if Icon}
					<Icon class="size-4" />
				{:else}
					{stepNumber}
				{/if}
			</div>

			<span class="text-sm font-medium {isActive ? 'text-foreground' : 'text-muted-foreground'}">
				{label}
			</span>
		</button>

		<!-- Connector line between steps (not after the last one) -->
		{#if stepNumber < steps.length}
			<div class="bg-border h-px w-8"></div>
		{/if}
	{/each}
</div>

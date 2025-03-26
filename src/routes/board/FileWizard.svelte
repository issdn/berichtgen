<script lang="ts">
	import { type Snippet } from 'svelte';
	import { WizardStep } from '$lib/types';

	const {
		file,
		children
	}: {
		file: File;
		children: Snippet<[{ step: WizardStep; message?: string | null; value: number; max: number }]>;
	} = $props();

	// svelte-ignore state_referenced_locally
	let step = $state<{ step: WizardStep; message?: string | null }>({ step: WizardStep.PROCESSING });

	let max = $state(0);

	let value = $state(0);
</script>

{@render children({ ...step, value, max })}

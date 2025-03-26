<script lang="ts">
	import { parseDOCX, parseDOCXData } from '$lib/parse/docx_parser';
	import { onMount, type Snippet } from 'svelte';
	import { IncuriaError, IncuriaErrorType, WizardStep } from '$lib/types';
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';
	import { getCompletions } from '$lib/hooks/completion';
	import { spreadEntriesAcrossWeeks } from '$lib/parse/time_spread';

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

	async function processFiles() {
		try {
			const data = new Uint8Array(await file.arrayBuffer());
			if (data === null)
				throw new IncuriaError(IncuriaErrorType.INVALID_FILE, 'Unbekannter Fehler');
			else {
				const docxData = await parseDOCXData(data, wizardScheduler.scheduler);
				max = docxData.textsOrRelIds.length;
				const text = (
					await parseDOCX(docxData, {
						scheduler: wizardScheduler.scheduler,
						onChunkFinished() {
							value += 1;
						}
					})
				).join('\n');
				const completion = await getCompletions({
					text,
					apiKey: 'sk-a75d88242ebe42bb9e14ebd1b6c8124f'
				});
				const timed = spreadEntriesAcrossWeeks(completion, [
					{ startDate: '2025-3-25', endDate: '2025-3-26' }
				]);
				wizardScheduler.onResult(file, timed);
			}
		} catch (e) {
			if (e instanceof IncuriaError) {
				step = { step: WizardStep.ERROR, message: e.message };
			} else {
				step = { step: WizardStep.ERROR, message: 'Unbekannter Fehler' };
			}
		} finally {
			step = { step: WizardStep.DONE };
		}
	}

	onMount(() => processFiles());
</script>

{@render children({ ...step, value, max })}

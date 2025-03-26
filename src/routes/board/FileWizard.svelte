<script lang="ts">
	import { parseDOCX, parseDOCXData } from '$lib/parse/docx_parser';
	import { onMount, type Snippet } from 'svelte';
	import { IncuriaError, IncuriaErrorType, WizardStep } from '$lib/types';
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';

	const {
		file,
		children
	}: {
		file: File;
		children: Snippet<[{ step: WizardStep; message?: string | null }]>;
	} = $props();

	// svelte-ignore state_referenced_locally
	let step = $state<{ step: WizardStep; message?: string | null }>({ step: WizardStep.PROCESSING });

	async function processFiles() {
		let text: string[] = [];
		try {
			const data = new Uint8Array(await file.arrayBuffer());
			if (data === null)
				throw new IncuriaError(IncuriaErrorType.INVALID_FILE, 'Unbekannter Fehler');
			else {
				const docxData = await parseDOCXData(data, wizardScheduler.scheduler);
				text = await parseDOCX(docxData, wizardScheduler.scheduler);
			}
		} catch (e) {
			if (e instanceof Error) {
				step = { step: WizardStep.ERROR, message: e.message };
			} else {
				step = { step: WizardStep.ERROR, message: 'Unbekannter Fehler' };
			}
		} finally {
			step = { step: WizardStep.DONE };
			wizardScheduler.onResult(file, text.join('\n'));
		}
	}

	onMount(() => processFiles());
</script>

{@render children(step)}

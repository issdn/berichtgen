import type { Scheduler } from 'tesseract.js';
import { combineJSONs } from './parse/combine';
import { WizardFileContext } from './wizard_file_context.svelte';
import { createStateMachineForContext } from './state_machine.svelte';
import type { Entry, ResultEntry } from './types';
export class WizardScheduler {
	batchSize = 5;

	files: FileList | null = $state(null);

	schedule: ReturnType<WizardScheduler['createProcessStateMachine']>[] | null = $derived.by(() => {
		if (this.files === null || this.files.length === 0) return null;
		return [...this.files!].map((file) => {
			return this.createProcessStateMachine(file);
		});
	});

	filesReady = $state(0);

	scheduler: Scheduler | null = null;

	result = $state<Promise<ResultEntry[]> | null>(null);

	processInit = $state<Promise<void> | null>(null);

	isRunning = $state(false);

	workersInUse = 0;

	workersNr = 0;

	async init() {
		this.isRunning = true;
		if (this.scheduler === null) {
			const { createScheduler } = await import('tesseract.js');
			this.scheduler = createScheduler();
		}
		this.result = null;
		this.filesReady = 0;
		for (let i = 0; i < this.batchSize; i++) {
			this.schedule?.at(i)?.machine.run();
		}
	}

	finish() {
		this.result = (async () => {
			const finishedFiles = this.schedule!.reduce((prev, { context }) => {
				if (context.finished != null) return [...prev, context.finished];
				return prev;
			}, [] as Required<Entry>[][]);
			await this.scheduler?.terminate();
			const combined = combineJSONs(finishedFiles);
			this.isRunning = false;
			return combined;
		})();
	}

	createProcessStateMachine(file: File) {
		const context = new WizardFileContext(file);
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const scheduler = this;

		const machine = createStateMachineForContext(context, scheduler);
		return { context, machine };
	}
}

// eslint-disable-next-line prefer-const
export let wizardScheduler = new WizardScheduler();

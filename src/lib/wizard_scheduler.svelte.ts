import type { Scheduler } from 'tesseract.js';
import type { Entry } from './types';
import { combineJSONs } from './parse/combine';
import { createStateMachineForContext } from '$lib/state_machine';
import { WizardFileContext } from '$lib/wizard_file_context';

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

	result = $state<Promise<string> | null>(null);

	processInit = $state<Promise<void> | null>(null);

	workersInUse = 0;

	workersNr = 0;

	async init() {
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
			const result = combineJSONs(finishedFiles);
			await this.scheduler?.terminate();
			const blob = new Blob([JSON.stringify(result)], { type: 'application/json' });
			return URL.createObjectURL(blob);
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

import type { Scheduler } from 'tesseract.js';
import type { Entry } from './types';
import { combineJSONs } from './parse/combine';

class WizardScheduler {
	batchSize = 1;

	files: FileList | null = $state(null);

	finished = $state<{ text: Required<Entry>[]; file: File }[] | null>(null);

	filesReady = $state(0);

	scheduler: Scheduler | null = null;

	done = $state(false);

	result = $state<Required<Entry>[] | null>(null);

	async createWorkerPool() {
		const { createScheduler, createWorker } = await import('tesseract.js');
		const scheduler = createScheduler();
		for (let i = 0; i < clamp(this.files!.length * 0.1, 1, 25); i++) {
			scheduler.addWorker(await createWorker('deu'));
		}
		return scheduler;
	}

	async run() {
		this.scheduler = await this.createWorkerPool();
		this.done = false;
		this.finished = null;
		this.filesReady = 0;
		this.files = null;
	}

	async finish() {
		this.result = combineJSONs((this.finished ?? []).map(({ text }) => text));
		await this.scheduler?.terminate();
		this.done = true;
		console.log(this.result);
	}

	async onResult(file: File, text: Required<Entry>[]) {
		this.finished = [...(this.finished ?? []), { file, text }];
		this.filesReady += 1;
		if (this.files !== null && this.finished.length === this.files.length) {
			await this.finish();
		}
	}
}

// eslint-disable-next-line prefer-const
export let wizardScheduler = new WizardScheduler();

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

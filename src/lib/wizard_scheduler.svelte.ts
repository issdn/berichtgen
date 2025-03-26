import type { Scheduler } from 'tesseract.js';

class WizardScheduler {
	batchSize = 1;

	files: FileList | null = $state(null);

	finished = $state<{ text: string; file: File }[]>([]);

	filesReady = $state(0);

	scheduler: Scheduler | null = null;

	done = $state(false);

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
	}

	async finish() {
		await this.scheduler?.terminate();
		this.done = true;
		this.files = null;
		this.finished = [];
		this.filesReady = 0;
	}

	async onResult(file: File, text: string) {
		this.finished = [...this.finished, { file, text }];
		this.filesReady += 1;
		if (this.files !== null && this.finished.length === this.files.length) {
			await this.finish();
			console.log(this.finished);
		}
	}
}

// eslint-disable-next-line prefer-const
export let wizardScheduler = new WizardScheduler();

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

import { clamp } from '$lib/utils';
import type { WizardFileContext } from '$wizard/services/wizard_file_context';
import type { Scheduler } from 'tesseract.js';

let workersInUse = 0;

let workersNr = 0;

export class Parser {
	scheduler: Scheduler | null = null;

	batchSize: number = 1;

	withImages: boolean = false;

	context: WizardFileContext;

	constructor(
		context: WizardFileContext,
		scheduler: Scheduler,
		withImages: boolean
	) {
		this.scheduler = scheduler;
		this.context = context;
		this.withImages = withImages;
	}

	async createWorkerPool(nrImages: number) {
		if (!this.withImages) return;
		const { createWorker } = await import('tesseract.js');
		this.batchSize = clamp(nrImages * 0.1, 1, 25);
		if (workersInUse + this.batchSize > workersNr) {
			workersNr += this.batchSize;
		}
		workersInUse += this.batchSize;
		for (let i = 0; i < this.batchSize; i++) {
			this.scheduler!.addWorker(await createWorker('deu'));
		}
	}

	async freeWorkers() {
		workersInUse -= this.batchSize;
	}
}

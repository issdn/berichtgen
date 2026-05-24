import type { WizardFileContext } from '$wizard/services/wizard_file_context';
import type { Scheduler } from 'tesseract.js';

import { clamp } from '$lib/utils';

let workersInUse = 0;

let workersNr = 0;

export class Parser {
	batchSize: number = 1;

	context: WizardFileContext;

	scheduler: null | Scheduler = null;

	withImages: boolean = false;

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

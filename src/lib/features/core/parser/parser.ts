import { clamp } from '$lib/utils';
import type { WizardFileContext } from '$wizard/services/wizard_file_context';
import { wizardMediator } from '$wizard/services/wizard_mediator.svelte';
import type { Scheduler } from 'tesseract.js';

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
		if (
			wizardMediator.workersInUse + this.batchSize >
			wizardMediator.workersNr
		) {
			wizardMediator.workersNr += this.batchSize;
		}
		wizardMediator.workersInUse += this.batchSize;
		for (let i = 0; i < this.batchSize; i++) {
			this.scheduler!.addWorker(await createWorker('deu'));
		}
	}

	async freeWorkers() {
		wizardMediator.workersInUse -= this.batchSize;
	}
}

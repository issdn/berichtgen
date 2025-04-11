import { incuriaStore } from '$lib/stores/board.svelte';
import { wizardScheduler, type WizardFileContext } from '$lib/wizard_scheduler.svelte';
import type { Scheduler } from 'tesseract.js';

export class Parser {
	scheduler: Scheduler | null = null;

	batchSize: number = 1;

	withImages: boolean = false;

	context: WizardFileContext;

	constructor(context: WizardFileContext, scheduler: Scheduler, withImages: boolean) {
		this.scheduler = scheduler;
		this.context = context;
		this.withImages = withImages;
	}

	async createWorkerPool(nrImages: number) {
		if (!incuriaStore.processPhotos) return;
		const { createWorker } = await import('tesseract.js');
		this.batchSize = this.clamp(nrImages * 0.1, 1, 25);
		if (wizardScheduler.workersInUse + this.batchSize > wizardScheduler.workersNr) {
			wizardScheduler.workersNr += this.batchSize;
		}
		wizardScheduler.workersInUse += this.batchSize;
		for (let i = 0; i < this.batchSize; i++) {
			this.scheduler!.addWorker(await createWorker('deu'));
		}
	}

	async freeWorkers() {
		wizardScheduler.workersInUse -= this.batchSize;
	}

	clamp(num: number, min: number, max: number) {
		return Math.min(Math.max(num, min), max);
	}
}

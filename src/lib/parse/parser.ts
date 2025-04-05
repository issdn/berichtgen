import type { WizardFileContext } from '$lib/wizard_scheduler.svelte';
import type { Scheduler } from 'tesseract.js';

export class Parser {
	scheduler: Scheduler | null = null;

	batchSize: number = 1;

	withImages: boolean = false;

	context: WizardFileContext;

	constructor(context: WizardFileContext, scheduler: Scheduler | null = null) {
		this.scheduler = scheduler;
		this.context = context;
	}

	async createWorkerPool(nrImages: number) {
		const { createWorker } = await import('tesseract.js');
		this.batchSize = this.clamp(nrImages * 0.1, 1, 25);
		for (let i = 0; i < this.batchSize; i++) {
			this.scheduler!.addWorker(await createWorker('deu'));
		}
	}

	clamp(num: number, min: number, max: number) {
		return Math.min(Math.max(num, min), max);
	}
}

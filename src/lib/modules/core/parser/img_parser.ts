import { Parser } from './parser';
import { WizardFileContext } from '$wizard/services/wizard_file_context.svelte';
import type { Scheduler } from 'tesseract.js';

export class IMGParser extends Parser {
	data: Uint8Array | null = null;

	constructor(context: WizardFileContext, scheduler: Scheduler) {
		super(context, scheduler, true);
	}

	async init(data: Uint8Array) {
		this.data = data;
		await this.createWorkerPool(1);
	}

	async parse() {
		const uint8 = new Uint8Array(this.data!);
		const result = await this.scheduler!.addJob('recognize', new Blob([uint8]));
		const {
			data: { text }
		} = result;
		return text;
	}
}

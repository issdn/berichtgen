import { Parser } from '$src/lib/parse/parser';
import type { WizardFileContext } from '$src/lib/wizard_file_context.svelte';
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
		const result = await this.scheduler!.addJob('recognize', new Blob([this.data!]));
		const {
			data: { text }
		} = result;
		return text;
	}
}

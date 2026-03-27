import { Parser } from '$core/parser/parser';
import type { WizardFileContext } from '$wizard/services/wizard_file_context.svelte';
import { ok } from 'neverthrow';
import type { Scheduler } from 'tesseract.js';

export class TXTParser extends Parser {
	data: string | null = null;

	constructor(context: WizardFileContext, scheduler: Scheduler) {
		super(context, scheduler, false);
	}

	async init(data: Uint8Array) {
		this.data = new TextDecoder().decode(data);
	}

	parse() {
		return ok(this.data as string);
	}
}

import { Parser } from '$parser/parser';
import type { WizardFileContext } from '$wizard/services/wizard_file_context';
import type { Scheduler } from 'tesseract.js';

export class TXTParser extends Parser {
	data: string | null = null;

	constructor(context: WizardFileContext, scheduler: Scheduler) {
		super(context, scheduler, false);
	}

	async init(data: Uint8Array) {
		this.data = new TextDecoder().decode(data);
	}

	parse(): string {
		return this.data as string;
	}
}

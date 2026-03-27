import { err, ok } from 'neverthrow';
import type { Scheduler } from 'tesseract.js';
import { TXTParser } from './txt_parser';
import type { WizardFileContext } from '$wizard/services/wizard_file_context.svelte';
import { fullResultSchema } from '$wizard/schemas';
import type { ResultEntry } from '$wizard/types';
import { ***REMOVED***Error } from '$lib/errors';

export class JSONParser extends TXTParser {
	constructor(context: WizardFileContext, scheduler: Scheduler) {
		super(context, scheduler);
	}

	toSchema() {
		try {
			const json = JSON.parse(this.data as string);
			const { data, error, success } = fullResultSchema.safeParse(json);
			if (success) {
				return ok(data as ResultEntry[]);
			}
			return err(
				new ***REMOVED***Error(
					'PARSE_FAILED',
					`Fehler beim Parsen des JSON: ${error.issues[0].message}`
				)
			);
		} catch {
			return err(
				new ***REMOVED***Error(
					'PARSE_FAILED',
					'Fehler beim Parsen des JSON: Ungültiges JSON-Format'
				)
			);
		}
	}
}

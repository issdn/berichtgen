import { IncuriaError } from '$src/lib/errors';
import { fullResultSchema } from '$src/lib/schemas';
import { TXTParser } from '$src/lib/parse/txt_parser';
import { IncuriaErrorType, type ResultEntry } from '$src/lib/types';
import type { WizardFileContext } from '$src/lib/wizard_file_context.svelte';
import { err, ok } from 'neverthrow';
import type { Scheduler } from 'tesseract.js';

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
				new IncuriaError(
					IncuriaErrorType.PARSE_FAILED,
					`Fehler beim Parsen des JSON: ${error.issues[0].message}`
				)
			);
		} catch {
			return err(
				new IncuriaError(
					IncuriaErrorType.PARSE_FAILED,
					'Fehler beim Parsen des JSON: Ungültiges JSON-Format'
				)
			);
		}
	}
}

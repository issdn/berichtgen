import { TXTParser } from './txt_parser';
import { WizardFileContext } from '$wizard/services/wizard_file_context';
import type { Scheduler } from 'tesseract.js';
import { fullResultSchema } from '$wizard/schemas';
import { okResult, errResult, type Result } from '$lib/result';
import { ParserError, EParserError } from '$core/parser/errors';
import type { ResultEntry } from '$wizard/types';

export class JSONParser extends TXTParser {
	constructor(context: WizardFileContext, scheduler: Scheduler) {
		super(context, scheduler);
	}

	toSchema(): Result<ResultEntry[]> {
		try {
			const json = JSON.parse(this.data as string);
			const { data, success } = fullResultSchema.safeParse(json);
			if (success) {
				return okResult(data as ResultEntry[]);
			}
			return errResult(ParserError, EParserError.PARSE_FAILED);
		} catch {
			return errResult(ParserError, EParserError.PARSE_FAILED);
		}
	}
}

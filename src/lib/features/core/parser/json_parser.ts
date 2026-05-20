import { TXTParser } from './txt_parser';
import { WizardFileContext } from '$wizard/services/wizard_file_context';
import type { Scheduler } from 'tesseract.js';
import { fullResultSchema } from '$wizard/schemas';
import { okResult, errResult, tryResult, type Result } from '$lib/result';
import { ParserError, EParserError } from '$core/parser/errors';
import type { ResultEntry } from '$wizard/types';

export class JSONParser extends TXTParser {
	constructor(context: WizardFileContext, scheduler: Scheduler) {
		super(context, scheduler);
	}

	toSchema(): Result<ResultEntry[]> {
		const parsed = tryResult(
			() => JSON.parse(this.data as string),
			ParserError,
			EParserError.PARSE_FAILED
		);
		if (!parsed.ok) {
			return errResult(ParserError, EParserError.PARSE_FAILED);
		}
		const { data, success } = fullResultSchema.safeParse(parsed.data);
		if (success) {
			return okResult(data as ResultEntry[]);
		}
		return errResult(ParserError, EParserError.PARSE_FAILED);
	}
}

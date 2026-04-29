import { BerichtgenError, buildError } from '$lib/errors';

export const EParserError = buildError({
	INVALID_FILE: { httpCode: 400, message: 'Ungültige Datei.' },
	FORMAT_NOT_SUPPORTED: { httpCode: 400, message: 'Format nicht unterstützt.' },
	PARSE_FAILED: { httpCode: 400, message: 'Parsing fehlgeschlagen.' },
	DEVELOPERS_FAULT: { httpCode: 500, message: 'Fehler des Entwicklers.' },
	DOCX_FAULTY: { httpCode: 400, message: 'DOCX-Datei fehlerhaft.' }
} as const);

type ParserErrorValue = (typeof EParserError)[keyof typeof EParserError];

export class ParserError extends BerichtgenError {
	declare readonly apiError: ParserErrorValue;

	constructor(apiError: ParserErrorValue) {
		super(apiError);
	}

	static fromCode(code: string): ParserError {
		const match = (Object.values(EParserError) as ParserErrorValue[]).find(
			(e) => e.code === code
		);
		return new ParserError(match ?? EParserError.PARSE_FAILED);
	}
}

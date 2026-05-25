import { buildError } from '$lib/errors';

export const EParserError = buildError('core.parser', {
	DEVELOPERS_FAULT: { httpCode: 500, message: 'Fehler des Entwicklers.' },
	DOCX_FAULTY: { httpCode: 400, message: 'DOCX-Datei fehlerhaft.' },
	FORMAT_NOT_SUPPORTED: { httpCode: 400, message: 'Format nicht unterstützt.' },
	INVALID_FILE: { httpCode: 400, message: 'Ungültige Datei.' },
	PARSE_FAILED: { httpCode: 400, message: 'Parsing fehlgeschlagen.' }
} as const);

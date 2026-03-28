import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ok, err } from 'neverthrow';
import { FileTypes } from '$wizard/enums';
import { ***REMOVED***Error } from '$lib/errors';
import type { ResultEntry } from '$wizard/types';

// ─── Module mocks ─────────────────────────────────────────────────────────────
// Prevent the real parser modules (and their heavy native deps) from loading.
// Each mock provides a constructor that returns a test double with the minimal
// surface the service exercises: init() and parse() / toSchema().

vi.mock('$wizard/services/wizard_scheduler.svelte', () => ({
	wizardScheduler: { workersInUse: 0, workersNr: 0 }
}));

vi.mock('$core/parser/txt_parser', () => ({
	TXTParser: vi.fn().mockImplementation(() => ({
		init: vi.fn().mockResolvedValue(undefined),
		parse: vi.fn().mockReturnValue(ok('decoded text'))
	}))
}));

vi.mock('$core/parser/json_parser', () => ({
	JSONParser: vi.fn().mockImplementation(() => ({
		init: vi.fn().mockResolvedValue(undefined),
		/** Inherited parse() returns the raw text string. */
		parse: vi.fn().mockReturnValue(ok('raw json text')),
		/** toSchema() returns validated ResultEntry[]. */
		toSchema: vi.fn().mockReturnValue(
			ok([{ text: 'Eintrag', datum: '2024-01-01', ort: 'BETRIEB', stunden: 8 }] as ResultEntry[])
		)
	}))
}));

vi.mock('$core/parser/img_parser', () => ({
	IMGParser: vi.fn().mockImplementation(() => ({
		init: vi.fn().mockResolvedValue(undefined),
		parse: vi.fn().mockResolvedValue('ocr ergebnis')
	}))
}));

vi.mock('$core/parser/pdf_parser', () => ({
	PDFParser: vi.fn().mockImplementation(() => ({
		init: vi.fn().mockResolvedValue(undefined),
		parse: vi.fn().mockResolvedValue('pdf text')
	}))
}));

vi.mock('$core/parser/docx_parser', () => ({
	DOCXParser: vi.fn().mockImplementation(() => ({
		init: vi.fn().mockResolvedValue(undefined),
		parse: vi.fn().mockResolvedValue('docx text')
	}))
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { parseFile, type ParseOptions } from '$core/parser/parse_service';
import { WizardFileContext } from '$wizard/services/wizard_file_context.svelte';
import type { Scheduler } from 'tesseract.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Creates a minimal File with the given MIME type. */
function makeFile(content: string, type: string, name = 'test'): File {
	return new File([content], name, { type });
}

/** Default options: no photos, no AI reword. */
const DEFAULT_OPTIONS: ParseOptions = { processPhotos: false, rewordJSON: false };

/** Stub scheduler — OCR workers are never started in these tests. */
const SCHEDULER = {} as Scheduler;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('parseFile', () => {
	describe('plain-text / CSV', () => {
		test('parses TXT file and returns decoded text', async () => {
			const file = makeFile('hallo', FileTypes.TXT, 'test.txt');
			const result = await parseFile(
				file,
				new WizardFileContext(file),
				SCHEDULER,
				DEFAULT_OPTIONS
			);
			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap()).toBe('decoded text');
		});

		test('parses CSV file via the same TXT parser path', async () => {
			const file = makeFile('a,b,c', FileTypes.CSV, 'data.csv');
			const result = await parseFile(
				file,
				new WizardFileContext(file),
				SCHEDULER,
				DEFAULT_OPTIONS
			);
			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap()).toBe('decoded text');
		});
	});

	describe('JSON', () => {
		test('validates JSON against schema when rewordJSON=false', async () => {
			const file = makeFile('[]', FileTypes.JSON, 'data.json');
			const result = await parseFile(file, new WizardFileContext(file), SCHEDULER, {
				...DEFAULT_OPTIONS,
				rewordJSON: false
			});
			expect(result.isOk()).toBe(true);
			// toSchema() was called → returns ResultEntry[]
			expect(Array.isArray(result._unsafeUnwrap())).toBe(true);
		});

		test('returns raw text for AI reformatting when rewordJSON=true', async () => {
			const file = makeFile('[]', FileTypes.JSON, 'data.json');
			const result = await parseFile(file, new WizardFileContext(file), SCHEDULER, {
				...DEFAULT_OPTIONS,
				rewordJSON: true
			});
			expect(result.isOk()).toBe(true);
			// parse() was called → returns raw string
			expect(result._unsafeUnwrap()).toBe('raw json text');
		});

		test('propagates toSchema() errors', async () => {
			const { JSONParser } = await import('$core/parser/json_parser');
			const parseError = new ***REMOVED***Error('PARSE_FAILED', 'Ungültiges JSON');
			vi.mocked(JSONParser).mockImplementationOnce(() => ({
				init: vi.fn().mockResolvedValue(undefined),
				parse: vi.fn().mockReturnValue(ok('raw')),
				toSchema: vi.fn().mockReturnValue(err(parseError))
			}));

			const file = makeFile('{invalid}', FileTypes.JSON, 'bad.json');
			const result = await parseFile(file, new WizardFileContext(file), SCHEDULER, {
				...DEFAULT_OPTIONS,
				rewordJSON: false
			});
			expect(result.isErr()).toBe(true);
			expect(result._unsafeUnwrapErr()).toBe(parseError);
		});
	});

	describe('images', () => {
		test('parses PNG file via OCR', async () => {
			const file = makeFile('img', FileTypes.PNG, 'bild.png');
			const result = await parseFile(
				file,
				new WizardFileContext(file),
				SCHEDULER,
				DEFAULT_OPTIONS
			);
			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap()).toBe('ocr ergebnis');
		});

		test('parses JPG file via OCR', async () => {
			const file = makeFile('img', FileTypes.JPG, 'bild.jpg');
			const result = await parseFile(
				file,
				new WizardFileContext(file),
				SCHEDULER,
				DEFAULT_OPTIONS
			);
			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap()).toBe('ocr ergebnis');
		});
	});

	describe('PDF', () => {
		test('parses PDF and returns extracted text', async () => {
			const file = makeFile('%PDF', FileTypes.PDF, 'dok.pdf');
			const result = await parseFile(
				file,
				new WizardFileContext(file),
				SCHEDULER,
				DEFAULT_OPTIONS
			);
			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap()).toBe('pdf text');
		});
	});

	describe('DOCX', () => {
		test('parses DOCX and returns extracted text', async () => {
			const file = makeFile('PK', FileTypes.DOCX, 'dok.docx');
			const result = await parseFile(
				file,
				new WizardFileContext(file),
				SCHEDULER,
				DEFAULT_OPTIONS
			);
			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap()).toBe('docx text');
		});
	});

	describe('error handling', () => {
		test('returns INVALID_FILE error for unsupported MIME type', async () => {
			const file = makeFile('data', 'application/octet-stream', 'file.bin');
			const result = await parseFile(
				file,
				new WizardFileContext(file),
				SCHEDULER,
				DEFAULT_OPTIONS
			);
			expect(result.isErr()).toBe(true);
			expect(result._unsafeUnwrapErr().type).toBe('INVALID_FILE');
		});

		test('wraps parser init errors as PARSE_FAILED', async () => {
			const { TXTParser } = await import('$core/parser/txt_parser');
			vi.mocked(TXTParser).mockImplementationOnce(() => ({
				init: vi.fn().mockRejectedValue(new Error('Lesefehler')),
				parse: vi.fn()
			}));

			const file = makeFile('data', FileTypes.TXT, 'fail.txt');
			const result = await parseFile(
				file,
				new WizardFileContext(file),
				SCHEDULER,
				DEFAULT_OPTIONS
			);
			expect(result.isErr()).toBe(true);
			expect(result._unsafeUnwrapErr().type).toBe('PARSE_FAILED');
		});
	});
});

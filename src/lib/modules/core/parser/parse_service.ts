import type { Scheduler } from 'tesseract.js';
import { ResultAsync, errAsync } from 'neverthrow';
import type { WizardFileContext } from '$wizard/services/wizard_file_context.svelte';
import { ***REMOVED***Error } from '$lib/errors';
import type { ResultEntry } from '$wizard/types';
import { FileTypes } from '$wizard/enums';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Options controlling parser behaviour.
 *
 * These are intentionally explicit so that the service has no hidden
 * dependency on any global store and remains easy to unit-test.
 */
export type ParseOptions = {
	/**
	 * When `true`, embedded images inside PDF and DOCX files are processed
	 * via OCR and their recognised text is included in the output.
	 */
	processPhotos: boolean;
	/**
	 * Controls how JSON files are handled:
	 * - `true`  → the raw text is returned as-is (for downstream AI reformatting).
	 * - `false` → the JSON is validated directly against the result schema.
	 */
	rewordJSON: boolean;
};

/**
 * The single entry point for parsing any supported file type.
 *
 * Reads the file bytes, selects the appropriate parser by MIME type, and
 * dynamically loads only that parser's module (tree-shaking / lazy-loading).
 * All errors are wrapped in {@link ***REMOVED***Error} and returned as
 * `ResultAsync` failures — no exceptions escape.
 *
 * Supported MIME types (via {@link FileTypes}):
 * `image/png`, `image/jpeg`, `text/plain`, `text/csv`,
 * `application/json`, `application/pdf`, DOCX.
 *
 * @param file      - The file to parse.
 * @param context   - Wizard context supplying cancellation and lifecycle hooks.
 * @param scheduler - The Tesseract.js scheduler used for OCR operations.
 * @param options   - Explicit parsing options (avoids hidden global-state reads).
 * @returns A `ResultAsync` that resolves to either plain text (`string`) or
 *   structured result entries (`ResultEntry[]`), depending on the file type
 *   and the supplied options.
 */
export function parseFile(
	file: File,
	context: WizardFileContext,
	scheduler: Scheduler,
	options: ParseOptions
): ResultAsync<string | ResultEntry[], ***REMOVED***Error> {
	return readFile(file).andThen((data) =>
		dispatchParser(file.type, data, context, scheduler, options)
	);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Reads a {@link File} into a raw `Uint8Array` buffer.
 *
 * @returns A `ResultAsync` wrapping the byte buffer, or an `INVALID_FILE`
 *   error if the browser could not read the file.
 */
function readFile(file: File): ResultAsync<Uint8Array, ***REMOVED***Error> {
	return ResultAsync.fromPromise(
		file.arrayBuffer().then((buf) => new Uint8Array(buf)),
		() => new ***REMOVED***Error('INVALID_FILE', 'Fehler beim Lesen der Datei')
	);
}

/**
 * Routes to the appropriate lazy-loaded parser based on MIME type.
 *
 * Each parser module is only imported when the corresponding file type is
 * actually processed, keeping the initial bundle lean.
 */
function dispatchParser(
	mimeType: string,
	data: Uint8Array,
	context: WizardFileContext,
	scheduler: Scheduler,
	options: ParseOptions
): ResultAsync<string | ResultEntry[], ***REMOVED***Error> {
	switch (mimeType) {
		case FileTypes.PNG:
		case FileTypes.JPG:
			return loadImage(data, context, scheduler);

		case FileTypes.TXT:
		case FileTypes.CSV:
			return loadText(data, context, scheduler);

		case FileTypes.JSON:
			return loadJson(data, context, scheduler, options.rewordJSON);

		case FileTypes.PDF:
			return loadPdf(data, context, scheduler, options.processPhotos);

		case FileTypes.DOCX:
			return loadDocx(data, context, scheduler, options.processPhotos);

		default:
			return errAsync(
				new ***REMOVED***Error('INVALID_FILE', 'Dateityp nicht unterstützt.')
			);
	}
}

/**
 * Lazily loads {@link IMGParser} and runs OCR on a single image file.
 */
function loadImage(
	data: Uint8Array,
	context: WizardFileContext,
	scheduler: Scheduler
): ResultAsync<string, ***REMOVED***Error> {
	return ResultAsync.fromPromise(
		import('$core/parser/img_parser').then(async ({ IMGParser }) => {
			const parser = new IMGParser(context, scheduler);
			await parser.init(data);
			return parser.parse();
		}),
		(e) => ***REMOVED***Error.fromUnknown(e, 'Fehler beim Parsen des Bildes', 'PARSE_FAILED')
	);
}

/**
 * Lazily loads {@link TXTParser} and decodes a plain-text or CSV file.
 */
function loadText(
	data: Uint8Array,
	context: WizardFileContext,
	scheduler: Scheduler
): ResultAsync<string, ***REMOVED***Error> {
	return ResultAsync.fromPromise(
		import('$core/parser/txt_parser').then(async ({ TXTParser }) => {
			const parser = new TXTParser(context, scheduler);
			await parser.init(data);
			// TXTParser.parse() is infallible (returns ok()), unwrap is safe.
			return parser.parse()._unsafeUnwrap();
		}),
		(e) => ***REMOVED***Error.fromUnknown(e, 'Fehler beim Parsen der Textdatei', 'PARSE_FAILED')
	);
}

/**
 * Lazily loads {@link JSONParser} and either validates the content against the
 * result schema (`rewordJSON = false`) or returns the raw text for downstream
 * AI reformatting (`rewordJSON = true`).
 */
function loadJson(
	data: Uint8Array,
	context: WizardFileContext,
	scheduler: Scheduler,
	rewordJSON: boolean
): ResultAsync<string | ResultEntry[], ***REMOVED***Error> {
	return ResultAsync.fromPromise(
		import('$core/parser/json_parser').then(async ({ JSONParser }) => {
			const parser = new JSONParser(context, scheduler);
			await parser.init(data);
			return parser;
		}),
		(e) =>
			***REMOVED***Error.fromUnknown(
				e,
				'Fehler beim Initialisieren des JSON Parsers',
				'PARSE_FAILED'
			)
	).andThen((parser) =>
		rewordJSON
			? (parser.parse() as ReturnType<typeof parser.parse>)
			: parser.toSchema()
	);
}

/**
 * Lazily loads {@link PDFParser} and extracts text from all pages,
 * optionally running OCR on image-bearing pages.
 */
function loadPdf(
	data: Uint8Array,
	context: WizardFileContext,
	scheduler: Scheduler,
	processPhotos: boolean
): ResultAsync<string, ***REMOVED***Error> {
	return ResultAsync.fromPromise(
		import('$core/parser/pdf_parser').then(async ({ PDFParser }) => {
			const parser = new PDFParser(context, scheduler, createOffscreenCanvas, processPhotos);
			await parser.init(data);
			return parser.parse();
		}),
		(e) => ***REMOVED***Error.fromUnknown(e, 'Fehler beim Parsen des PDF', 'PARSE_FAILED')
	);
}

/**
 * Lazily loads {@link DOCXParser} and extracts text from a Word document,
 * optionally running OCR on embedded images.
 */
function loadDocx(
	data: Uint8Array,
	context: WizardFileContext,
	scheduler: Scheduler,
	processPhotos: boolean
): ResultAsync<string, ***REMOVED***Error> {
	return ResultAsync.fromPromise(
		import('$core/parser/docx_parser').then(async ({ DOCXParser }) => {
			const parser = new DOCXParser(context, scheduler, processPhotos);
			await parser.init(data);
			return parser.parse();
		}),
		(e) => ***REMOVED***Error.fromUnknown(e, 'Fehler beim Parsen des DOCX', 'PARSE_FAILED')
	);
}

/**
 * Factory passed to {@link PDFParser} for creating an `OffscreenCanvas` per
 * page. Kept here so the parser itself stays free of browser-API concerns.
 */
function createOffscreenCanvas(
	width: number,
	height: number
): { canvas: OffscreenCanvas; context: OffscreenCanvasRenderingContext2D } {
	const canvas = new OffscreenCanvas(width, height);
	// getContext('2d') is guaranteed to return non-null for OffscreenCanvas.
	const context = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
	return { canvas, context };
}

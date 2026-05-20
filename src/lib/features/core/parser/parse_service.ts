import type { Scheduler } from 'tesseract.js';
import type { WizardFileContext } from '$wizard/services/wizard_file_context';
import { ParserError, EParserError } from '$core/parser/errors';
import { type Result, errResult, tryResultAsync } from '$lib/result';
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
 * All errors are wrapped in {@link BerichtgenError} and returned as
 * `Result` failures — no exceptions escape.
 *
 * Supported MIME types (via {@link FileTypes}):
 * `image/png`, `image/jpeg`, `text/plain`, `text/csv`,
 * `application/json`, `application/pdf`, DOCX.
 *
 * @param file      - The file to parse.
 * @param context   - Wizard context supplying cancellation and lifecycle hooks.
 * @param scheduler - The Tesseract.js scheduler used for OCR operations.
 * @param options   - Explicit parsing options (avoids hidden global-state reads).
 * @returns A `Result` that resolves to either plain text (`string`) or
 *   structured result entries (`ResultEntry[]`), depending on the file type
 *   and the supplied options.
 */
export async function parseFile(
	file: File,
	context: WizardFileContext,
	scheduler: Scheduler,
	options: ParseOptions
): Promise<Result<string | ResultEntry[]>> {
	const fileResult = await readFile(file);
	if (!fileResult.ok) return fileResult;
	return dispatchParser(
		file.type,
		fileResult.data,
		context,
		scheduler,
		options
	);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Reads a {@link File} into a raw `Uint8Array` buffer.
 *
 * @returns A `Result` wrapping the byte buffer, or an `INVALID_FILE`
 *   error if the browser could not read the file.
 */
function readFile(file: File): Promise<Result<Uint8Array>> {
	return tryResultAsync(
		file.arrayBuffer().then((buf) => new Uint8Array(buf)),
		ParserError,
		EParserError.INVALID_FILE
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
): Promise<Result<string | ResultEntry[]>> {
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
			return Promise.resolve(errResult(ParserError, EParserError.INVALID_FILE));
	}
}

/**
 * Lazily loads {@link IMGParser} and runs OCR on a single image file.
 */
function loadImage(
	data: Uint8Array,
	context: WizardFileContext,
	scheduler: Scheduler
): Promise<Result<string>> {
	return tryResultAsync(
		import('$core/parser/img_parser').then(async ({ IMGParser }) => {
			const parser = new IMGParser(context, scheduler);
			await parser.init(data);
			return parser.parse();
		}),
		ParserError,
		EParserError.PARSE_FAILED
	);
}

/**
 * Lazily loads {@link TXTParser} and decodes a plain-text or CSV file.
 */
function loadText(
	data: Uint8Array,
	context: WizardFileContext,
	scheduler: Scheduler
): Promise<Result<string>> {
	return tryResultAsync(
		import('$core/parser/txt_parser').then(async ({ TXTParser }) => {
			const parser = new TXTParser(context, scheduler);
			await parser.init(data);
			return parser.parse();
		}),
		ParserError,
		EParserError.PARSE_FAILED
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
): Promise<Result<string | ResultEntry[]>> {
	return tryResultAsync(
		import('$core/parser/json_parser').then(async ({ JSONParser }) => {
			const parser = new JSONParser(context, scheduler);
			await parser.init(data);
			if (rewordJSON) return parser.parse() as string | ResultEntry[];
			const schemaResult = parser.toSchema();
			if (!schemaResult.ok) throw schemaResult.error;
			return schemaResult.data as string | ResultEntry[];
		}),
		ParserError,
		EParserError.PARSE_FAILED
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
): Promise<Result<string>> {
	return tryResultAsync(
		import('$core/parser/pdf_parser').then(async ({ PDFParser }) => {
			const parser = new PDFParser(
				context,
				scheduler,
				createOffscreenCanvas,
				processPhotos
			);
			await parser.init(data);
			return parser.parse();
		}),
		ParserError,
		EParserError.PARSE_FAILED
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
): Promise<Result<string>> {
	return tryResultAsync(
		import('$core/parser/docx_parser').then(async ({ DOCXParser }) => {
			const parser = new DOCXParser(context, scheduler, processPhotos);
			await parser.init(data);
			return parser.parse();
		}),
		ParserError,
		EParserError.PARSE_FAILED
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

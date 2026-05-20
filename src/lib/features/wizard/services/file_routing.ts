import type { Scheduler } from 'tesseract.js';
import type { WizardFileContext } from './wizard_file_context';
import type { ParseOptions } from '$core/parser/parse_service';
import { parseFile } from '$core/parser/parse_service';
import { requestGcsUploadCommand } from '$wizard/api/wizard.remote';
import { WizardError, EFileRoutingError, EGCSError } from '$wizard/errors';
import { errorByHttpCode } from '$lib/errors';
import { type Result, okResult, tryResultAsync } from '$lib/result';
import { FileTypes } from '$wizard/enums';

/** Maps a GCS HTTP response status to the matching {@link EGCSError} entry. */
function gcsErrorFromStatus(status: number): WizardError {
	return new WizardError(
		errorByHttpCode(EGCSError, status) ?? EGCSError.INTERNAL_SERVER_ERROR
	);
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Files at or below this size are sent inline (base64) in the completion request. */
export const INLINE_MAX_BYTES = 1 * 1024 * 1024; // 1 MB

/** Files at or below this size may be routed via GCS; above this they are parsed. */
export const GCS_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

// ─── Routing types ────────────────────────────────────────────────────────────

/**
 * The file was parsed into plain text (fallback for > 50 MB or JSON schema validation).
 * Passed to Gemini as a text part.
 */
export type TextRouting = {
	type: 'text';
	text: string;
};

/**
 * The file is small enough (≤ 1 MB) to be sent inline as base64.
 * Passed to Gemini as an `inlineData` part.
 */
export type InlineRouting = {
	type: 'inline';
	/** Base64-encoded file content. */
	data: string;
	mimeType: string;
};

/**
 * The file was uploaded directly to Google Cloud Storage.
 * Passed to Gemini as a `fileData` part using the `gs://` URI.
 */
export type GcsRouting = {
	type: 'gcs';
	/** GCS object URI, e.g. `gs://bucket/uploads/userId/uuid/file.pdf`. */
	fileUri: string;
	mimeType: string;
};

/**
 * A web URL pasted by the user or specified in the config file.
 * Gemini fetches it at inference time via Google Search grounding.
 */
export type UrlRouting = {
	type: 'url';
	url: string;
};

/** Discriminated union of all possible file routing strategies. */
export type FileRouting = TextRouting | InlineRouting | GcsRouting | UrlRouting;

// ─── Response types ───────────────────────────────────────────────────────────

/** Response body from `POST /board/user/upload-url`. */
export type UploadUrlResponse = {
	signedUrl?: string;
	fileUri: string;
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Determines how a file should be routed to Gemini and prepares it accordingly.
 *
 * Decision tree:
 * 1. JSON with `rewordJSON = false` → validate via `parseFile()` (returns `ResultEntry[]` or errors)
 * 2. File > 50 MB → fall back to `parseFile()`, wrap result as `TextRouting`
 * 3. File ≤ 1 MB → read and base64-encode, return `InlineRouting`
 * 4. File 1 MB–50 MB → request GCS signed URL, PUT file, return `GcsRouting`
 *
 * @param file      - The file to route.
 * @param context   - Wizard context (used by `parseFile` for cancellation / lifecycle hooks).
 * @param scheduler - Tesseract.js scheduler (used by `parseFile` for OCR).
 * @param options   - Parsing options forwarded to `parseFile` when the fallback is used.
 */
export async function resolveFileRouting(
	file: File,
	context: WizardFileContext,
	scheduler: Scheduler,
	options: ParseOptions
): Promise<Result<FileRouting | import('$wizard/types').ResultEntry[]>> {
	// JSON without reword: let the existing JSON parser validate the schema and
	// return structured ResultEntry[] directly — skip routing entirely.
	if (file.type === FileTypes.JSON && !options.rewordJSON) {
		const result = await parseFile(file, context, scheduler, options);
		if (!result.ok) return result;
		// With rewordJSON=false, the JSON parser always returns ResultEntry[].
		return okResult(result.data as import('$wizard/types').ResultEntry[]);
	}

	const { size, type: mimeType } = file;

	// Large files (> 50 MB): fall back to the existing text parsers.
	// If no parser exists for the MIME type, `parseFile` will return an error.
	if (size > GCS_MAX_BYTES) {
		const parseResult = await parseFile(file, context, scheduler, options);
		if (!parseResult.ok) return parseResult;

		// `parseFile` may return either a string (text) or ResultEntry[] (e.g. JSON reword).
		// Wrap strings in TextRouting; pass ResultEntry[] through as-is.
		const data = parseResult.data;
		if (typeof data === 'string') {
			return okResult<FileRouting>({ type: 'text', text: data });
		}
		// ResultEntry[] (only possible for JSON rewordJSON=true at this size, unlikely but handled)
		return okResult(data);
	}

	// Small files (≤ 1 MB): encode inline as base64.
	if (size <= INLINE_MAX_BYTES) {
		return file
			.bytes()
			.then((buf) => buf.toBase64())
			.then((data) => {
				return okResult<FileRouting>({
					type: 'inline',
					data,
					mimeType
				});
			});
	}

	// Medium files (1 MB–50 MB): upload to GCS and return a gs:// URI.
	return uploadToGcs(file);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Requests a GCS signed upload URL from the server, then uploads the file
 * directly to Google Cloud Storage.
 *
 * @returns `GcsRouting` with the `gs://` URI on success.
 */
async function uploadToGcs(file: File): Promise<Result<FileRouting>> {
	// Step 1: request a signed URL via remote command.
	const uploadUrlResult = await tryResultAsync(
		requestGcsUploadCommand({
			fileName: file.name,
			fullFilePath: file.webkitRelativePath || file.name,
			contentType: file.type,
			fileSize: file.size
		}),
		WizardError,
		EFileRoutingError.GCS_UPLOAD_URL_FAILED
	);
	if (!uploadUrlResult.ok) return uploadUrlResult;

	const { signedUrl, fileUri } = uploadUrlResult.data;

	// If no signed URL is returned, the object already exists and can be reused.
	if (!signedUrl) {
		return okResult<FileRouting>({
			type: 'gcs',
			fileUri,
			mimeType: file.type
		});
	}

	// Step 2: PUT the file directly to GCS (Vercel never sees the bytes).
	return tryResultAsync(
		fetch(signedUrl, {
			method: 'PUT',
			headers: {
				'Content-Type': file.type,
				'x-goog-if-generation-match': '0'
			},
			body: file
		}).then((res) => {
			if (res.status === 412) {
				// Object already exists from a previous failed completion run.
				// Reuse it instead of failing the flow.
				return { type: 'gcs' as const, fileUri, mimeType: file.type };
			}
			if (!res.ok) throw gcsErrorFromStatus(res.status);
			return { type: 'gcs' as const, fileUri, mimeType: file.type };
		}),
		WizardError,
		EFileRoutingError.GCS_UPLOAD_FAILED
	);
}

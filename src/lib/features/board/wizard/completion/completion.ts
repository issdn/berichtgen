import { WizardError, EWizardError } from '$wizard/errors';
import { type Result, tryResultAsync } from '$lib/result';
import type { Ort } from '$wizard/enums';
import type {
	BatchCompletionApiResponse,
	BatchCompletionItem
} from '$wizard/schemas';
import type { CompletionResult } from '$wizard/types';
import type { FileRouting } from '$wizard/services/file_routing';
import { toErrorBody } from '$lib/errors';

/** Maximum total UTF-8 byte size for a single batch request (4 MB). */
export const MAX_BATCH_BYTES = 4 * 1024 * 1024;

/**
 * Strips characters that encode to more than 2 bytes in UTF-8 (code points > U+07FF).
 * Keeps ASCII, Latin-1 Supplement, Latin Extended-A/B, and German umlauts
 * (ä ö ü ß Ä Ö Ü — all ≤ U+00FF, well within the 2-byte boundary).
 * Removes CJK, emoji, and any other multi-byte scripts.
 */
export function sanitizeToTwoByteUTF8(text: string): string {
	return [...text]
		.filter((char) => (char.codePointAt(0) ?? 0) <= 0x7ff)
		.join('');
}

/** Returns the UTF-8 encoded byte length of a string. */
export function getByteSize(text: string): number {
	return new TextEncoder().encode(text).byteLength;
}

/**
 * Splits `text` into the minimum number of equal-sized chunks where each
 * chunk's UTF-8 byte size does not exceed `maxBytes`.
 * If the text already fits in one chunk it is returned as a single-element array.
 *
 * Chunks are equal by character count; the small byte-size variation due to
 * 1-vs-2-byte characters is negligible after {@link sanitizeToTwoByteUTF8}.
 */
export function splitTextIntoChunks(
	text: string,
	maxBytes: number = MAX_BATCH_BYTES
): string[] {
	const byteSize = getByteSize(text);
	if (byteSize <= maxBytes) return [text];

	const numChunks = Math.ceil(byteSize / maxBytes);
	const charsPerChunk = Math.ceil(text.length / numChunks);

	const chunks: string[] = [];
	for (let i = 0; i < numChunks; i++) {
		const start = i * charsPerChunk;
		const end = Math.min(start + charsPerChunk, text.length);
		if (start < text.length) {
			chunks.push(text.slice(start, end));
		}
	}
	return chunks;
}

/**
 * Groups items into the fewest sequential batches where the combined UTF-8
 * byte size of all texts in each batch does not exceed `maxBytes`.
 * An item whose text alone exceeds `maxBytes` forms a batch by itself
 * (use {@link splitTextIntoChunks} upstream to prevent oversized items).
 */
export function createBatchesBySize<T extends { text: string }>(
	items: T[],
	maxBytes: number = MAX_BATCH_BYTES
): T[][] {
	const batches: T[][] = [];
	let currentBatch: T[] = [];
	let currentSize = 0;

	for (const item of items) {
		const size = getByteSize(item.text);
		if (currentBatch.length > 0 && currentSize + size > maxBytes) {
			batches.push(currentBatch);
			currentBatch = [item];
			currentSize = size;
		} else {
			currentBatch.push(item);
			currentSize += size;
		}
	}

	if (currentBatch.length > 0) {
		batches.push(currentBatch);
	}

	return batches;
}

/**
 * Sends a single batch of completion items to the server endpoint.
 * Returns the raw API response, including `insufficient_tokens` when the user's
 * token budget could not cover all items.
 *
 * Each item carries a `FileRouting` descriptor that determines how it is sent:
 * - `text`   → `{ type: 'text', text, ort }`
 * - `inline` → `{ type: 'inline', data, mimeType, ort }`
 * - `file`   → `{ type: 'file', fileUri, mimeType, ort }`
 */
export function sendBatchCompletion(
	items: Array<{ routing: FileRouting; ort: Ort }>
): Promise<Result<BatchCompletionApiResponse>> {
	const mapped: BatchCompletionItem[] = items.map(({ routing, ort }) => {
		if (routing.type === 'text') {
			return { type: 'text', text: routing.text, ort };
		} else if (routing.type === 'inline') {
			return {
				type: 'inline',
				data: routing.data,
				mimeType: routing.mimeType,
				ort
			};
		} else if (routing.type === 'url') {
			return { type: 'url', url: routing.url, ort };
		} else {
			return {
				type: 'file',
				fileUri: routing.fileUri,
				mimeType: routing.mimeType,
				ort
			};
		}
	});

	return tryResultAsync(
		fetch('/board/user/completion', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ items: mapped })
		}).then(async (res) => {
			const data = await res.json();
			if (res.status >= 400) {
				throw WizardError.fromCode(toErrorBody(data).code);
			}
			return data as BatchCompletionApiResponse;
		}),
		WizardError,
		EWizardError.INVALID_JSON_FROM_AI
	);
}

/**
 * Converts an array of AI-returned strings into `Entry` objects
 * as expected by the rest of the processing pipeline.
 */
export function stringsToEntries(strings: string[]): CompletionResult {
	return strings.map((text) => ({ text }));
}




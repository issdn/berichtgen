import type { Ort } from '$wizard/enums';
import type {
	BatchCompletionApiResponse,
	BatchCompletionItem
} from '$wizard/schemas';
import type { CompletionResult, FileRouting } from '$wizard/types';

import { type Result, tryResultAsync } from '$lib/result';
import { submitBatchCompletionCommand } from '$wizard/api/wizard.remote';
import { EWizardError, WizardError } from '$wizard/errors';

/** Maximum total UTF-8 byte size for a single batch request (4 MB). */
export const MAX_BATCH_BYTES = 4 * 1024 * 1024;

/**
 * Groups items into the fewest sequential batches where the combined UTF-8
 * byte size of all texts in each batch does not exceed `maxBytes`.
 * An item whose text alone exceeds `maxBytes` forms a batch by itself.
 */
export function createBatchesBySize<T extends { data: string }>(
	items: T[],
	maxBytes: number = MAX_BATCH_BYTES
): T[][] {
	const batches: T[][] = [];
	let currentBatch: T[] = [];
	let currentSize = 0;

	for (const item of items) {
		const size = getByteSize(item.data);
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
 * - `inline` -> `{ type: 'inline', data, mimeType, ort }`
 * - `gcs`    -> `{ type: 'gcs', fileUri, mimeType, ort }`
 * - `url`    -> `{ type: 'url', url, ort }`
 */
export function sendBatchCompletion(
	items: Array<{ ort: Ort; routing: FileRouting }>
): Promise<Result<BatchCompletionApiResponse>> {
	const mapped: BatchCompletionItem[] = items.map(({ ort, routing }) => ({
		ort,
		...routing
	}));

	return tryResultAsync(
		submitBatchCompletionCommand({ items: mapped }),
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

/** Returns the UTF-8 encoded byte length of a string. */
function getByteSize(text: string): number {
	return new TextEncoder().encode(text).byteLength;
}

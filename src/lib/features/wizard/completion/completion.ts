import type { Ort } from '$wizard/enums';
import type { BatchCompletionItem } from '$wizard/schemas';
import type { FileRouting } from '$wizard/services/routing';
import type { BatchCompletionApiResponse } from '$wizard/types';

import { type Result, tryResultAsync } from '$lib/result';
import { submitBatchCompletionCommand } from '$wizard/api/wizard.remote';
import { EWizardError } from '$wizard/errors';

/** Maximum total UTF-8 byte size for a single batch request (4 MB). */
export const MAX_BATCH_BYTES = 4 * 1024 * 1024;

/**
 * Groups items into the fewest sequential batches where the combined UTF-8
 * byte size of all texts in each batch does not exceed `maxBytes`.
 * An item whose text alone exceeds `maxBytes` forms a batch by itself.
 */
export function createBatchesBySize<T>(
	items: T[],
	maxBytes: number = MAX_BATCH_BYTES,
	getItemSize: ({ item }: { item: T }) => number = ({ item }) => {
		const candidate = item as {
			data?: unknown;
			routing?: { getSize: () => number };
			text?: unknown;
		};
		if (candidate.routing && typeof candidate.routing.getSize === 'function') {
			return candidate.routing.getSize();
		}
		if (typeof candidate.data === 'string') return getByteSize(candidate.data);
		if (typeof candidate.text === 'string') return getByteSize(candidate.text);
		return getByteSize(JSON.stringify(item));
	}
) {
	const batches: T[][] = [];
	let currentBatch: T[] = [];
	let currentSize = 0;

	for (const item of items) {
		const size = getItemSize({ item });
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
	const mapped: BatchCompletionItem[] = items.map(({ ort, routing }) =>
		routing.toBatchCompletionItem({ ort })
	);

	return tryResultAsync({
		apiError: EWizardError.INVALID_JSON_FROM_AI,
		promise: submitBatchCompletionCommand({ items: mapped })
	});
}

function getByteSize(text: string): number {
	return new TextEncoder().encode(text).byteLength;
}

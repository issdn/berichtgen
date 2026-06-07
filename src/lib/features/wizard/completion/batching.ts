/** Fixed number of wizard files sent in one completion request. */
export const MAX_BATCH_ITEMS = 10;

/**
 * Splits items into sequential batches of at most `batchSize` entries.
 */
export function createBatchesByCount<T>({
	batchSize = MAX_BATCH_ITEMS,
	items
}: {
	batchSize?: number;
	items: T[];
}): T[][] {
	if (items.length === 0) return [];

	const batches: T[][] = [];

	for (let start = 0; start < items.length; start += batchSize) {
		batches.push(items.slice(start, start + batchSize));
	}

	return batches;
}

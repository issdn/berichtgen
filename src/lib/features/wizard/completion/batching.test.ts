import {
	createBatchesByCount,
	MAX_BATCH_ITEMS
} from '$wizard/completion/batching';
import { describe, expect, test } from 'vitest';

describe('createBatchesByCount', () => {
	test('returns empty list for empty input', () => {
		expect(createBatchesByCount({ items: [] })).toEqual([]);
	});

	test('keeps all items in one batch when item count fits', () => {
		const items = Array.from({ length: 3 }, (_, index) => ({ index }));

		const batches = createBatchesByCount({ items });

		expect(batches).toEqual([items]);
	});

	test('splits items strictly into groups of 10 by default', () => {
		const items = Array.from({ length: 23 }, (_, index) => index);

		const batches = createBatchesByCount({ items });

		expect(batches).toHaveLength(3);
		expect(batches[0]).toHaveLength(MAX_BATCH_ITEMS);
		expect(batches[1]).toHaveLength(MAX_BATCH_ITEMS);
		expect(batches[2]).toHaveLength(3);
	});

	test('preserves input order across batches', () => {
		const items = Array.from({ length: 12 }, (_, index) => `item-${index}`);

		const batches = createBatchesByCount({ items });

		expect(batches.flat()).toEqual(items);
	});

	test('supports custom batch sizes', () => {
		const items = Array.from({ length: 5 }, (_, index) => index);

		const batches = createBatchesByCount({ batchSize: 2, items });

		expect(batches.map((batch) => batch.length)).toEqual([2, 2, 1]);
	});
});

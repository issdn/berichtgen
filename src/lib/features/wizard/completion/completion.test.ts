import { createBatchesBySize } from '$wizard/completion/completion';
import { describe, expect, test } from 'vitest';

describe('createBatchesBySize', () => {
	test('GIVEN small items WHEN combined size fits THEN returns one batch', () => {
		const items = [
			{ ort: 'SCHULE' as const, text: 'abc' },
			{ ort: 'BETRIEB' as const, text: 'def' }
		];
		const batches = createBatchesBySize(items, 1000);
		expect(batches).toHaveLength(1);
		expect(batches[0]).toHaveLength(2);
	});

	test('GIVEN low limit WHEN adding items exceeds limit THEN starts a new batch', () => {
		const items = [{ text: 'abc' }, { text: 'def' }, { text: 'ghi' }];
		const batches = createBatchesBySize(items, 5);
		expect(batches.length).toBeGreaterThan(1);
	});

	test('GIVEN oversized item WHEN batching THEN oversized item is isolated', () => {
		const items = [{ text: 'a'.repeat(100) }, { text: 'b' }];
		const batches = createBatchesBySize(items, 50);
		expect(batches).toHaveLength(2);
		expect(batches[0][0].text).toBe(items[0].text);
		expect(batches[1][0].text).toBe(items[1].text);
	});

	test('GIVEN ordered items WHEN split across batches THEN item order is preserved', () => {
		const items = [{ text: 'first' }, { text: 'second' }, { text: 'third' }];
		const batches = createBatchesBySize(items, 6);
		const flattened = batches.flat();
		expect(flattened.map((i) => i.text)).toEqual(['first', 'second', 'third']);
	});

	test('GIVEN empty input WHEN batching THEN returns empty list', () => {
		expect(createBatchesBySize([])).toEqual([]);
	});

	test('GIVEN item metadata WHEN batching THEN metadata remains intact', () => {
		const items = [{ extra: 42, ort: 'BETRIEB' as const, text: 'test' }];
		const batches = createBatchesBySize(items, 1000);
		expect(batches[0][0]).toMatchObject({ extra: 42 });
	});
});

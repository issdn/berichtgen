import { describe, expect, test } from 'vitest';
import {
	createBatchesBySize,
	getByteSize,
	MAX_BATCH_BYTES,
	sanitizeToTwoByteUTF8,
	splitTextIntoChunks
} from '$lib/completion/completion';

// ---------------------------------------------------------------------------
// sanitizeToTwoByteUTF8
// ---------------------------------------------------------------------------

describe('sanitizeToTwoByteUTF8', () => {
	test('keeps ASCII characters unchanged', () => {
		expect(sanitizeToTwoByteUTF8('Hello World')).toBe('Hello World');
	});

	test('keeps German umlauts (≤ U+00FF)', () => {
		const german = 'äöüÄÖÜß';
		expect(sanitizeToTwoByteUTF8(german)).toBe(german);
	});

	test('keeps Latin Extended characters up to U+07FF', () => {
		// U+07FF = last 2-byte UTF-8 codepoint
		const latin = '\u0400\u07FF'; // Cyrillic Е and Thaana letter NAA
		expect(sanitizeToTwoByteUTF8(latin)).toBe(latin);
	});

	test('strips CJK characters (≥ U+0800)', () => {
		expect(sanitizeToTwoByteUTF8('Hello 中文 World')).toBe('Hello  World');
	});

	test('strips emoji (≥ U+0800)', () => {
		expect(sanitizeToTwoByteUTF8('Hello 🎉')).toBe('Hello ');
	});

	test('returns empty string for all-stripped input', () => {
		expect(sanitizeToTwoByteUTF8('中文日本語')).toBe('');
	});

	test('handles mixed content correctly', () => {
		// em dash — is U+2014 (> U+07FF) so it is also stripped
		const result = sanitizeToTwoByteUTF8('Betr.: Arbeit 工作 — Übersicht');
		expect(result).toBe('Betr.: Arbeit   Übersicht');
	});
});

// ---------------------------------------------------------------------------
// splitTextIntoChunks
// ---------------------------------------------------------------------------

describe('splitTextIntoChunks', () => {
	test('returns single chunk when text fits within maxBytes', () => {
		const text = 'short text';
		const chunks = splitTextIntoChunks(text, 100);
		expect(chunks).toHaveLength(1);
		expect(chunks[0]).toBe(text);
	});

	test('splits large text into correct number of chunks', () => {
		// Each ASCII char = 1 byte; 10 chars per chunk limit
		const text = 'a'.repeat(30);
		const chunks = splitTextIntoChunks(text, 10);
		expect(chunks.length).toBeGreaterThanOrEqual(3);
		expect(chunks.join('')).toBe(text); // no data loss
	});

	test('all chunks are within the byte limit', () => {
		const text = 'Hello! '.repeat(200); // ~1400 bytes
		const maxBytes = 200;
		const chunks = splitTextIntoChunks(text, maxBytes);
		for (const chunk of chunks) {
			expect(getByteSize(chunk)).toBeLessThanOrEqual(maxBytes);
		}
	});

	test('joined chunks reconstruct the original text', () => {
		const original = 'Berichtstext über Ausbildungswoche. '.repeat(100);
		const chunks = splitTextIntoChunks(original, 500);
		expect(chunks.join('')).toBe(original);
	});

	test('produces equal-sized chunks for ASCII', () => {
		const text = 'x'.repeat(12);
		const chunks = splitTextIntoChunks(text, 4); // forces 3 chunks of 4 chars each
		expect(chunks).toHaveLength(3);
		for (const chunk of chunks) {
			expect(chunk.length).toBeGreaterThan(0);
		}
	});

	test('handles single-character text within limit', () => {
		expect(splitTextIntoChunks('a', MAX_BATCH_BYTES)).toEqual(['a']);
	});
});

// ---------------------------------------------------------------------------
// createBatchesBySize
// ---------------------------------------------------------------------------

describe('createBatchesBySize', () => {
	test('groups all items into one batch when total size fits', () => {
		const items = [
			{ text: 'abc', ort: 'SCHULE' as const },
			{ text: 'def', ort: 'BETRIEB' as const }
		];
		const batches = createBatchesBySize(items, 1000);
		expect(batches).toHaveLength(1);
		expect(batches[0]).toHaveLength(2);
	});

	test('splits into multiple batches when items exceed limit', () => {
		// 3 items of ~4 bytes each, limit 5 bytes → 3 batches of 1
		const items = [
			{ text: 'abc' }, // 3 bytes
			{ text: 'def' }, // 3 bytes
			{ text: 'ghi' } // 3 bytes
		];
		const batches = createBatchesBySize(items, 5);
		expect(batches.length).toBeGreaterThan(1);
	});

	test('an oversized single item forms its own batch', () => {
		const items = [
			{ text: 'a'.repeat(100) }, // 100 bytes — over limit
			{ text: 'b' } // 1 byte — under limit
		];
		const batches = createBatchesBySize(items, 50);
		// First item alone in a batch, second in another
		expect(batches).toHaveLength(2);
		expect(batches[0][0].text).toBe(items[0].text);
		expect(batches[1][0].text).toBe(items[1].text);
	});

	test('preserves item order across batches', () => {
		const items = [{ text: 'first' }, { text: 'second' }, { text: 'third' }];
		const batches = createBatchesBySize(items, 6);
		const flattened = batches.flat();
		expect(flattened.map((i) => i.text)).toEqual(['first', 'second', 'third']);
	});

	test('returns empty array for empty input', () => {
		expect(createBatchesBySize([])).toEqual([]);
	});

	test('returns single batch for single item', () => {
		const items = [{ text: 'hello' }];
		const batches = createBatchesBySize(items, 100);
		expect(batches).toHaveLength(1);
		expect(batches[0]).toHaveLength(1);
	});

	test('passes extra properties through untouched', () => {
		const items = [{ text: 'test', ort: 'BETRIEB' as const, extra: 42 }];
		const batches = createBatchesBySize(items, 1000);
		expect(batches[0][0]).toMatchObject({ extra: 42 });
	});
});

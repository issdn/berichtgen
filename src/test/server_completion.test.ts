import { describe, test, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock state — must be declared before vi.mock factories run
// ---------------------------------------------------------------------------

const {
	mockCountTokens,
	mockGenerateContent,
	mockTrxBalance,
	mockTrxExecute,
	mockBalance,
	mockRefundExecute,
	trx,
	db
} = vi.hoisted(() => {
	const mockCountTokens = vi.fn().mockResolvedValue({ totalTokens: 100 });
	const mockGenerateContent = vi.fn().mockResolvedValue({
		text: JSON.stringify(['AI result'])
	});
	const mockTrxBalance = vi.fn();
	const mockTrxExecute = vi.fn().mockResolvedValue([]);
	const mockBalance = vi.fn();
	const mockRefundExecute = vi.fn().mockResolvedValue([]);

	const trx = {
		selectFrom: vi.fn().mockReturnThis(),
		updateTable: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		forUpdate: vi.fn().mockReturnThis(),
		executeTakeFirst: () => mockTrxBalance(),
		execute: () => mockTrxExecute()
	};

	const db = {
		transaction: vi.fn().mockReturnValue({
			execute: vi
				.fn()
				.mockImplementation(async (fn: (t: typeof trx) => unknown) => fn(trx))
		}),
		selectFrom: vi.fn().mockReturnThis(),
		updateTable: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		executeTakeFirst: () => mockBalance(),
		execute: () => mockRefundExecute()
	};

	return {
		mockCountTokens,
		mockGenerateContent,
		mockTrxBalance,
		mockTrxExecute,
		mockBalance,
		mockRefundExecute,
		trx,
		db
	};
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@google/genai/tokenizer', () => ({
	LocalTokenizer: vi
		.fn()
		.mockImplementation(() => ({ countTokens: mockCountTokens }))
}));

vi.mock('@google/genai', () => ({
	GoogleGenAI: vi.fn().mockImplementation(() => ({
		models: {
			generateContent: mockGenerateContent,
			// countTokens is used for inline/gcs items; not exercised in these tests
			// (all test items are text-type, which use the local tokenizer)
			countTokens: vi.fn().mockResolvedValue({ totalTokens: 100 })
		}
	})),
	ApiError: class ApiError extends Error {
		status: number;
		constructor(message: string, status: number) {
			super(message);
			this.status = status;
		}
	}
}));

vi.mock('$env/dynamic/private', () => ({
	env: { GEMINI_MODEL: 'gemini-test' }
}));
vi.mock('$app/environment', () => ({ dev: false }));
vi.mock('@sentry/sveltekit', () => ({
	captureException: vi.fn(),
	captureEvent: vi.fn(),
	captureMessage: vi.fn()
}));
vi.mock('$src/lib/completion/prompt', () => ({
	getContextPrompt: vi.fn().mockReturnValue('system-prompt')
}));
vi.mock('$src/lib/constants', () => ({ DEFAULT_MODEL: 'gemini-default' }));
vi.mock('$lib/server/db', () => db);

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { POST } from '../routes/board/user/completion/+server';
import type { RequestEvent } from '@sveltejs/kit';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeEvent(body: unknown, userId = 'user-1'): any {
	return {
		request: new Request('http://localhost/board/user/completion', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}),
		locals: { user: { id: userId } }
	} as unknown as RequestEvent;
}

const validItems = [
	{ type: 'text' as const, text: 'Montag: Programmieren', ort: 'BETRIEB' },
	{ type: 'text' as const, text: 'Dienstag: Testen', ort: 'SCHULE' }
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /board/user/completion', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default: 1 000 tokens available; transaction succeeds
		mockBalance.mockResolvedValue({ tokens: 1000 });
		mockTrxBalance.mockResolvedValue({ tokens: 1000 });
		mockTrxExecute.mockResolvedValue([]);
		mockRefundExecute.mockResolvedValue([]);
		mockCountTokens.mockResolvedValue({ totalTokens: 100 });
		mockGenerateContent.mockResolvedValue({
			text: JSON.stringify(['AI result'])
		});
	});

	// -----------------------------------------------------------------------

	test('returns 401 when no user is authenticated', async () => {
		const event = {
			request: new Request('http://localhost/', {
				method: 'POST',
				body: JSON.stringify({ items: validItems })
			}),
			locals: { user: null }
		} as unknown as RequestEvent;

		await expect(POST(event)).rejects.toMatchObject({ status: 401 });
	});

	// -----------------------------------------------------------------------

	test('returns 400 for invalid request body', async () => {
		const event = makeEvent({ wrong: 'shape' });
		await expect(POST(event)).rejects.toMatchObject({ status: 400 });
	});

	// -----------------------------------------------------------------------

	test('returns 400 for empty items array', async () => {
		const event = makeEvent({ items: [] });
		await expect(POST(event)).rejects.toMatchObject({ status: 400 });
	});

	// -----------------------------------------------------------------------

	test('returns 402 when user has no tokens', async () => {
		mockBalance.mockResolvedValue({ tokens: 0 });
		const event = makeEvent({ items: validItems });
		await expect(POST(event)).rejects.toMatchObject({ status: 402 });
	});

	// -----------------------------------------------------------------------

	test('returns 402 when no items fit in the token budget', async () => {
		// 100 tokens per item, only 50 available
		mockBalance.mockResolvedValue({ tokens: 50 });
		mockCountTokens.mockResolvedValue({ totalTokens: 100 });
		const event = makeEvent({ items: validItems });
		await expect(POST(event)).rejects.toMatchObject({ status: 402 });
	});

	// -----------------------------------------------------------------------

	test('returns results for all items when budget is sufficient', async () => {
		const event = makeEvent({ items: validItems });
		const res = await POST(event);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.insufficient_tokens).toBe(false);
		expect(body.results).toHaveLength(2);
		// Both items received results
		expect(body.results[0]).toEqual(['AI result']);
		expect(body.results[1]).toEqual(['AI result']);
	});

	// -----------------------------------------------------------------------

	test('partial results when only some items fit', async () => {
		// First item costs 80 tokens, second costs 80 — budget 100 → only first fits
		mockCountTokens
			.mockResolvedValueOnce({ totalTokens: 80 })
			.mockResolvedValueOnce({ totalTokens: 80 });
		mockBalance.mockResolvedValue({ tokens: 100 });
		mockTrxBalance.mockResolvedValue({ tokens: 100 });

		const event = makeEvent({ items: validItems });
		const res = await POST(event);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.insufficient_tokens).toBe(true);
		// First item has a result, second is null
		expect(body.results[0]).toEqual(['AI result']);
		expect(body.results[1]).toBeNull();
	});

	// -----------------------------------------------------------------------

	test('refunds tokens and errors when Gemini API throws', async () => {
		mockGenerateContent.mockRejectedValue(new Error('API down'));

		const event = makeEvent({ items: [validItems[0]] });
		await expect(POST(event)).rejects.toMatchObject({ status: 404 });

		// Refund call: updateTable('user_token_count').set(...).where(...).execute()
		expect(mockRefundExecute).toHaveBeenCalledOnce();
	});

	// -----------------------------------------------------------------------

	test('refunds tokens and errors when Gemini returns invalid JSON', async () => {
		mockGenerateContent.mockResolvedValue({ text: 'NOT_VALID_JSON' });

		const event = makeEvent({ items: [validItems[0]] });
		await expect(POST(event)).rejects.toMatchObject({ status: 500 });

		// Refund must have been issued
		expect(mockRefundExecute).toHaveBeenCalledOnce();
	});

	// -----------------------------------------------------------------------

	test('deducts tokens inside a transaction', async () => {
		const event = makeEvent({ items: [validItems[0]] });
		await POST(event);

		// The transaction execute should have been called once for deduction
		expect(db.transaction().execute).toHaveBeenCalled();
	});

	// -----------------------------------------------------------------------

	test('calls Gemini in parallel — both items are sent', async () => {
		const event = makeEvent({ items: validItems });
		await POST(event);

		// Two items → two generateContent calls
		expect(mockGenerateContent).toHaveBeenCalledTimes(2);
	});
});

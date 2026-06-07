import { Ort } from '$wizard/enums';
import { ECompletionException, EWizardError } from '$wizard/errors';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { countItemTokensMock, dbMock, runCompletionMock, sentryMock, trxMock } =
	vi.hoisted(() => ({
		countItemTokensMock: vi.fn(),
		dbMock: {
			execute: vi.fn(),
			executeTakeFirst: vi.fn(),
			select: vi.fn().mockReturnThis(),
			selectFrom: vi.fn().mockReturnThis(),
			set: vi.fn().mockReturnThis(),
			transaction: vi.fn(),
			updateTable: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis()
		},
		runCompletionMock: vi.fn(),
		sentryMock: {
			captureException: vi.fn(),
			captureMessage: vi.fn()
		},
		trxMock: {
			execute: vi.fn(),
			executeTakeFirst: vi.fn(),
			forUpdate: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			selectFrom: vi.fn().mockReturnThis(),
			set: vi.fn().mockReturnThis(),
			updateTable: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis()
		}
	}));

vi.mock('$env/dynamic/private', () => ({
	env: {}
}));

vi.mock('$env/static/private', () => ({
	GCS_BUCKET_NAME: 'wizard-bucket',
	GCS_SERVICE_ACCOUNT_KEY: JSON.stringify({
		client_email: 'svc@example.com',
		private_key: 'private-key',
		project_id: 'project-id'
	})
}));

vi.mock('$lib/server/db', () => ({
	default: dbMock
}));

vi.mock('$wizard/completion/gemini', () => ({
	countItemTokens: countItemTokensMock,
	runCompletion: runCompletionMock
}));

vi.mock('@google/genai', () => ({
	GoogleGenAI: vi.fn().mockImplementation(function GoogleGenAIMock() {
		return {};
	})
}));

vi.mock('@google-cloud/storage', () => ({
	Storage: vi.fn().mockImplementation(function StorageMock() {
		return {};
	})
}));

vi.mock('@sentry/sveltekit', () => sentryMock);

import { runBatchCompletion } from './wizard.handlers';

beforeEach(() => {
	vi.clearAllMocks();

	dbMock.selectFrom.mockReturnThis();
	dbMock.select.mockReturnThis();
	dbMock.where.mockReturnThis();
	dbMock.updateTable.mockReturnThis();
	dbMock.set.mockReturnThis();
	dbMock.execute.mockResolvedValue(undefined);

	trxMock.selectFrom.mockReturnThis();
	trxMock.select.mockReturnThis();
	trxMock.where.mockReturnThis();
	trxMock.forUpdate.mockReturnThis();
	trxMock.updateTable.mockReturnThis();
	trxMock.set.mockReturnThis();
	trxMock.execute.mockResolvedValue(undefined);
	trxMock.executeTakeFirst.mockResolvedValue({ tokens: 100 });

	dbMock.transaction.mockReturnValue({
		execute: async (callback: (trx: typeof trxMock) => Promise<void>) =>
			callback(trxMock)
	});
});

function makeInlineItem(data: string) {
	return {
		data,
		mimeType: 'text/plain',
		ort: Ort.BETRIEB,
		type: 'inline'
	} as const;
}

function extractTokenDelta(call: Parameters<typeof dbMock.set>[0]): {
	operator: '+' | '-';
	value: number;
} {
	const node = call.tokens.toOperationNode();
	return {
		operator: node.sqlFragments[0].includes('+') ? '+' : '-',
		value: node.parameters[0].value
	};
}

function refundAmounts(): number[] {
	return dbMock.set.mock.calls
		.map(([call]) => extractTokenDelta(call))
		.filter((delta) => delta.operator === '+')
		.map((delta) => delta.value);
}

describe('runBatchCompletion', () => {
	test('returns per-item batch results and refunds only rejected item tokens', async () => {
		countItemTokensMock.mockResolvedValueOnce(10);
		countItemTokensMock.mockResolvedValueOnce(20);
		countItemTokensMock.mockResolvedValueOnce(30);

		dbMock.executeTakeFirst.mockResolvedValue({ tokens: 100 });

		runCompletionMock.mockResolvedValueOnce(['first']);
		runCompletionMock.mockRejectedValueOnce(new Error('gemini failed'));
		runCompletionMock.mockResolvedValueOnce(['third']);

		const result = await runBatchCompletion({
			items: [
				makeInlineItem('first'),
				makeInlineItem('second'),
				makeInlineItem('third')
			],
			userId: 'user-1'
		});

		expect(result).toEqual([
			{ data: ['first'], ok: true },
			{
				error: {
					...ECompletionException.UNKNOWN_THIRD_PARTY_ERROR,
					global: true
				},
				ok: false
			},
			{ data: ['third'], ok: true }
		]);
		expect(refundAmounts()).toEqual([20]);
	});

	test('classifies invalid-json failures inside the handler and refunds only that item', async () => {
		countItemTokensMock.mockResolvedValueOnce(11);
		countItemTokensMock.mockResolvedValueOnce(22);
		countItemTokensMock.mockResolvedValueOnce(33);

		dbMock.executeTakeFirst.mockResolvedValue({ tokens: 100 });

		runCompletionMock.mockResolvedValueOnce(['first']);
		runCompletionMock.mockResolvedValueOnce(null);
		runCompletionMock.mockResolvedValueOnce(['third']);

		const result = await runBatchCompletion({
			items: [
				makeInlineItem('first'),
				makeInlineItem('second'),
				makeInlineItem('third')
			],
			userId: 'user-1'
		});

		expect(result).toEqual([
			{ data: ['first'], ok: true },
			{
				error: { ...EWizardError.INVALID_JSON_FROM_AI, global: false },
				ok: false
			},
			{ data: ['third'], ok: true }
		]);
		expect(refundAmounts()).toEqual([22]);
	});

	test('throws NOT_ENOUGH_TOKENS when the full batch does not fit into the user balance', async () => {
		countItemTokensMock.mockResolvedValueOnce(60);
		countItemTokensMock.mockResolvedValueOnce(50);

		dbMock.executeTakeFirst.mockResolvedValue({ tokens: 60 });

		await expect(
			runBatchCompletion({
				items: [makeInlineItem('first'), makeInlineItem('second')],
				userId: 'user-1'
			})
		).rejects.toMatchObject({
			apiError: ECompletionException.NOT_ENOUGH_TOKENS
		});

		expect(runCompletionMock).not.toHaveBeenCalled();
	});
});

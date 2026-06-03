import { VERTEX_AI_CONSENT_TYPE } from '$lib/constants';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { dbMock } = vi.hoisted(() => ({
	dbMock: {
		execute: vi.fn(),
		executeTakeFirst: vi.fn(),
		insertInto: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		selectFrom: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis()
	}
}));

vi.mock('$lib/server/db', () => ({ default: dbMock }));

import {
	appendConsentLog,
	readVertexAiConsentGranted
} from './consent.handlers';

beforeEach(() => {
	vi.clearAllMocks();
	dbMock.selectFrom.mockReturnThis();
	dbMock.select.mockReturnThis();
	dbMock.where.mockReturnThis();
	dbMock.orderBy.mockReturnThis();
	dbMock.insertInto.mockReturnThis();
	dbMock.values.mockReturnThis();
});

describe('readVertexAiConsentGranted', () => {
	test('returns false when there is no consent row yet', async () => {
		dbMock.executeTakeFirst.mockResolvedValue(undefined);

		const result = await readVertexAiConsentGranted({ userId: 'user-1' });

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).toBe(false);
		}
	});

	test('returns granted when latest row is granted', async () => {
		dbMock.executeTakeFirst.mockResolvedValue({ status: 'granted' });

		const result = await readVertexAiConsentGranted({ userId: 'user-1' });

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).toBe(true);
		}
	});

	test('returns withdrawn when latest row is withdrawn', async () => {
		dbMock.executeTakeFirst.mockResolvedValue({ status: 'withdrawn' });

		const result = await readVertexAiConsentGranted({ userId: 'user-1' });

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).toBe(false);
		}
	});
});

describe('appendConsentLog', () => {
	test('inserts a new immutable row with app version metadata', async () => {
		dbMock.execute.mockResolvedValue(undefined);

		const result = await appendConsentLog({
			appVersion: '0.0.1-beta',
			consentType: VERTEX_AI_CONSENT_TYPE,
			source: 'wizard',
			status: 'granted',
			userEmail: 'user@example.com',
			userId: 'user-1'
		});

		expect(result.ok).toBe(true);
		expect(dbMock.values).toHaveBeenCalledWith(
			expect.objectContaining({
				app_version: '0.0.1-beta',
				source: 'wizard',
				status: 'granted',
				user_email: 'user@example.com',
				user_id: 'user-1'
			})
		);
	});
});

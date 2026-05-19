import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ECommonServerError } from '$lib/errors';

const { dbMock } = vi.hoisted(() => ({
	dbMock: {
		insertInto: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		execute: vi.fn()
	}
}));

vi.mock('$lib/server/db', () => ({ default: dbMock, db: dbMock }));

import { submitFeedback } from '$auth/api/handlers/feedback';

describe('submitFeedback', () => {
	beforeEach(() => vi.clearAllMocks());

	test('rejects unauthenticated submission', async () => {
		await expect(
			submitFeedback({ message: 'hello' }, undefined)
		).rejects.toMatchObject({
			status: ECommonServerError.UNAUTHORIZED.httpCode
		});
	});

	test('inserts feedback for authenticated user', async () => {
		dbMock.execute.mockResolvedValue(undefined);
		await expect(
			submitFeedback({ message: '   ' }, 'user-1')
		).resolves.toBeUndefined();
		expect(dbMock.insertInto).toHaveBeenCalledWith('user_feedback');
		expect(dbMock.values).toHaveBeenCalledWith({
			user_id: 'user-1',
			message: '   '
		});
	});
});

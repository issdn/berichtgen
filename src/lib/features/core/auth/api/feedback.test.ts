import { ECommonServerError } from '$lib/errors';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { dbMock } = vi.hoisted(() => ({
	dbMock: {
		execute: vi.fn(),
		insertInto: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis()
	}
}));

vi.mock('$lib/server/db', () => ({ db: dbMock, default: dbMock }));

import { submitFeedback } from '$core/auth/api/feedback.handlers';

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
			message: '   ',
			user_id: 'user-1'
		});
	});
});

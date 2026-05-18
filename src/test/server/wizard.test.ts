import { describe, test, expect, vi, beforeEach } from 'vitest';

const { dbMock } = vi.hoisted(() => ({
	dbMock: {
		selectFrom: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		executeTakeFirst: vi.fn()
	}
}));

vi.mock('$lib/server/db', () => ({ default: dbMock, db: dbMock }));
vi.mock('@sentry/sveltekit', () => ({ captureException: vi.fn() }));

import { checkPreferredTemplateExists } from '$wizard/api/handlers/wizard';
import * as Sentry from '@sentry/sveltekit';

describe('checkPreferredTemplateExists', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		dbMock.selectFrom.mockReturnThis();
		dbMock.select.mockReturnThis();
		dbMock.where.mockReturnThis();
	});

	test('returns true when the template row exists', async () => {
		dbMock.executeTakeFirst.mockResolvedValue({
			storage_path: 'templates/foo.docx'
		});
		expect(await checkPreferredTemplateExists('templates/foo.docx')).toBe(true);
	});

	test('returns false when the template row does not exist', async () => {
		dbMock.executeTakeFirst.mockResolvedValue(undefined);
		expect(await checkPreferredTemplateExists('templates/deleted.docx')).toBe(false);
	});

	test('returns false and captures exception on DB error', async () => {
		const err = new Error('connection refused');
		dbMock.executeTakeFirst.mockRejectedValue(err);
		expect(await checkPreferredTemplateExists('templates/foo.docx')).toBe(false);
		expect(Sentry.captureException).toHaveBeenCalledOnce();
	});
});

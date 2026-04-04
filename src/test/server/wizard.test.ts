/**
 * Unit tests for the wizard business-logic layer.
 *
 * Strategy
 * --------
 * - `checkPreferredTemplateExists` touches the DB, so a chainable Kysely mock
 *   is used to control return values without a real database.
 * - Sentry is stubbed so tests remain fast and offline-capable.
 *
 * Run with:  pnpm vitest run src/test/server/wizard.test.ts
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// ─── Module mocks ────────────────────────────────────────────────────────────

/** Chainable Kysely mock — each terminal method is a vi.fn() you can configure. */
const dbMock = {
	selectFrom: vi.fn().mockReturnThis(),
	select: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	executeTakeFirst: vi.fn()
};

vi.mock('$lib/server/db', () => ({ db: dbMock }));

vi.mock('@sentry/sveltekit', () => ({
	captureException: vi.fn()
}));

// ─── Import SUT after mocks are registered ───────────────────────────────────

import { checkPreferredTemplateExists } from '$wizard/api/handlers/wizard';
import * as Sentry from '@sentry/sveltekit';

// ─── Tests ───────────────────────────────────────────────────────────────────

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

		const result = await checkPreferredTemplateExists('templates/foo.docx');

		expect(result).toBe(true);
		expect(dbMock.selectFrom).toHaveBeenCalledWith('template');
		expect(dbMock.where).toHaveBeenCalledWith(
			'storage_path',
			'=',
			'templates/foo.docx'
		);
	});

	test('returns false when the template row does not exist', async () => {
		dbMock.executeTakeFirst.mockResolvedValue(undefined);

		const result = await checkPreferredTemplateExists('templates/deleted.docx');

		expect(result).toBe(false);
	});

	test('returns false and captures exception on DB error', async () => {
		const err = new Error('connection refused');
		dbMock.executeTakeFirst.mockRejectedValue(err);

		const result = await checkPreferredTemplateExists('templates/foo.docx');

		expect(result).toBe(false);
		expect(Sentry.captureException).toHaveBeenCalledWith(err);
	});
});

/**
 * Unit tests for the template business-logic layer.
 *
 * Strategy
 * --------
 * - Pure helpers (`paginateTemplates`, `validateCanReport`) are tested with no
 *   mocks — they are plain TypeScript functions.
 * - DB-touching functions (`submitTemplateReport`, `deleteTemplateReport`, …)
 *   use a chainable Kysely mock so we can control return values per call and
 *   assert which queries were issued without touching a real database.
 * - External services (`supabaseAdmin`, `@sentry/sveltekit`, `fetch`) are
 *   stubbed so tests are fast, deterministic, and offline-capable.
 *
 * Run with:  pnpm vitest run src/lib/server/templates.test.ts
 */

import { TEMPLATE_PAGE_SIZE } from '$lib/constants';
import { ECommonServerError } from '$lib/errors';
import { ETemplateError } from '$wizard/errors';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// ─── Module mocks ────────────────────────────────────────────────────────────

const { dbMock, storageMock } = vi.hoisted(() => ({
	dbMock: {
		deleteFrom: vi.fn().mockReturnThis(),
		execute: vi.fn(),
		executeTakeFirst: vi.fn(),
		insertInto: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		selectFrom: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		updateTable: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis()
	},
	storageMock: {
		from: vi.fn().mockReturnThis(),
		remove: vi.fn().mockResolvedValue({ error: null }),
		upload: vi.fn().mockResolvedValue({ error: null })
	}
}));

vi.mock('$lib/server/db', () => ({ db: dbMock, default: dbMock }));

vi.mock('$lib/server/admin', () => ({
	supabaseAdmin: { storage: storageMock }
}));

vi.mock('@sentry/sveltekit', () => ({
	captureException: vi.fn()
}));

vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'https://test.supabase.co'
}));

// Stub global fetch used in submitTemplateReport's quarantine copy
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

// ─── Import SUT after mocks are registered ───────────────────────────────────

import {
	deleteTemplateReport,
	paginateTemplates,
	submitTemplateReport,
	type TemplateRow,
	validateCanReport
} from '$templates/api/templates.handlers';

// ─── Factories ───────────────────────────────────────────────────────────────

/** Build a minimal TemplateRow for use in tests. */
function makeRow(overrides: Partial<TemplateRow> = {}): TemplateRow {
	return {
		created_at: '2024-01-01T00:00:00Z',
		has_pending_report: false,
		id: 'row-1',
		is_mine: false,
		is_public: false,
		profile: null,
		reported_by_me: false,
		safe_marked_at: null,
		storage_path: 'user-1/file.docx',
		updated_at: null,
		user_id: 'user-1',
		...overrides
	};
}

// ─── paginateTemplates ───────────────────────────────────────────────────────

describe('paginateTemplates', () => {
	const mine = makeRow({ id: 'mine-1', is_mine: true });
	const others = Array.from({ length: TEMPLATE_PAGE_SIZE + 1 }, (_, i) =>
		makeRow({ id: `other-${i}`, is_mine: false })
	);

	test('first page includes mine and PAGE_SIZE others', () => {
		const result = paginateTemplates(
			[mine, ...others],
			undefined,
			TEMPLATE_PAGE_SIZE
		);
		expect(result.hasMore).toBe(true);
		expect(result.templates).toHaveLength(TEMPLATE_PAGE_SIZE + 1); // mine + PAGE_SIZE others
		expect(result.templates[0]).toEqual(mine);
	});

	test('subsequent pages exclude mine entirely', () => {
		const result = paginateTemplates(
			[mine, ...others],
			'some-cursor-id',
			TEMPLATE_PAGE_SIZE
		);
		expect(result.templates.every((t) => !t.is_mine)).toBe(true);
	});

	test('hasMore is false when others fit within page size', () => {
		const fewOthers = others.slice(0, TEMPLATE_PAGE_SIZE - 1);
		const result = paginateTemplates(
			[mine, ...fewOthers],
			undefined,
			TEMPLATE_PAGE_SIZE
		);
		expect(result.hasMore).toBe(false);
	});

	test('hasMore is true when DB returns PAGE_SIZE + 1 others', () => {
		// DB is asked for LIMIT PAGE_SIZE + 1 — if it returns that many, there is a next page
		const result = paginateTemplates(others, undefined, TEMPLATE_PAGE_SIZE);
		expect(result.hasMore).toBe(true);
		expect(result.templates.filter((t) => !t.is_mine)).toHaveLength(
			TEMPLATE_PAGE_SIZE
		);
	});

	test('empty result set returns empty templates and hasMore false', () => {
		const result = paginateTemplates([], undefined, TEMPLATE_PAGE_SIZE);
		expect(result.templates).toHaveLength(0);
		expect(result.hasMore).toBe(false);
	});

	test('only mine and no others returns mine with hasMore false', () => {
		const result = paginateTemplates([mine], undefined, TEMPLATE_PAGE_SIZE);
		expect(result.templates).toEqual([mine]);
		expect(result.hasMore).toBe(false);
	});
});

// ─── validateCanReport ───────────────────────────────────────────────────────

describe('validateCanReport', () => {
	const userId = 'reporter-id';
	const otherUserId = 'other-user-id';
	const existingReport = { id: 'report-1' };

	const validTemplate = makeRow({
		id: 'tmpl-1',
		safe_marked_at: null,
		user_id: otherUserId
	});

	test('passes silently when all conditions are satisfied', () => {
		expect(() =>
			validateCanReport(validTemplate, userId, undefined)
		).not.toThrow();
	});

	test('throws TEMPLATE_NOT_FOUND when template is undefined', () => {
		expect(() => validateCanReport(undefined, userId, undefined)).toThrowError(
			expect.objectContaining({
				status: ETemplateError.TEMPLATE_NOT_FOUND.httpCode
			})
		);
	});

	test('throws CANNOT_REPORT_OWN when user owns the template', () => {
		const ownTemplate = makeRow({ user_id: userId });
		expect(() =>
			validateCanReport(ownTemplate, userId, undefined)
		).toThrowError(
			expect.objectContaining({
				status: ETemplateError.CANNOT_REPORT_OWN.httpCode
			})
		);
	});

	test('throws TEMPLATE_SAFE when safe_marked_at is set', () => {
		const safeTemplate = makeRow({
			safe_marked_at: '2024-01-01T00:00:00Z',
			user_id: otherUserId
		});
		expect(() =>
			validateCanReport(safeTemplate, userId, undefined)
		).toThrowError(
			expect.objectContaining({
				status: ETemplateError.TEMPLATE_SAFE.httpCode
			})
		);
	});

	test('throws ALREADY_REPORTED when an existing report is present', () => {
		expect(() =>
			validateCanReport(validTemplate, userId, existingReport)
		).toThrowError(
			expect.objectContaining({
				status: ETemplateError.ALREADY_REPORTED.httpCode
			})
		);
	});
});

// ─── deleteTemplateReport ────────────────────────────────────────────────────

describe('deleteTemplateReport', () => {
	beforeEach(() => vi.clearAllMocks());

	test('issues DELETE with correct template and user filters', async () => {
		dbMock.execute.mockResolvedValue({});
		await deleteTemplateReport('tmpl-uuid', 'user-uuid');

		expect(dbMock.deleteFrom).toHaveBeenCalledWith('template_report');
		expect(dbMock.where).toHaveBeenCalledWith('template_id', '=', 'tmpl-uuid');
		expect(dbMock.where).toHaveBeenCalledWith(
			'reporter_user_id',
			'=',
			'user-uuid'
		);
		expect(dbMock.execute).toHaveBeenCalledOnce();
	});

	test('throws DATABASE_ERROR when the delete query fails', async () => {
		dbMock.execute.mockRejectedValue(new Error('db failure'));
		await expect(
			deleteTemplateReport('tmpl-uuid', 'user-uuid')
		).rejects.toMatchObject({
			status: ECommonServerError.DATABASE_ERROR.httpCode
		});
	});
});

// ─── submitTemplateReport ────────────────────────────────────────────────────

describe('submitTemplateReport', () => {
	beforeEach(() => vi.clearAllMocks());

	const template = {
		id: 'tmpl-1',
		safe_marked_at: null,
		storage_path: 'owner-id/file.docx',
		user_id: 'owner-id'
	};

	test('inserts report when all validation passes', async () => {
		// First executeTakeFirst → template found; second → no existing report
		dbMock.executeTakeFirst
			.mockResolvedValueOnce(template)
			.mockResolvedValueOnce(undefined);
		dbMock.execute.mockResolvedValue({});

		await submitTemplateReport(
			{ message: 'spam', templateId: 'tmpl-1' },
			'reporter-id'
		);

		expect(dbMock.insertInto).toHaveBeenCalledWith('template_report');
		expect(dbMock.values).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'spam',
				reporter_user_id: 'reporter-id',
				template_id: 'tmpl-1'
			})
		);
	});

	test('stores null message when none is provided', async () => {
		dbMock.executeTakeFirst
			.mockResolvedValueOnce(template)
			.mockResolvedValueOnce(undefined);
		dbMock.execute.mockResolvedValue({});

		await submitTemplateReport({ templateId: 'tmpl-1' }, 'reporter-id');

		expect(dbMock.values).toHaveBeenCalledWith(
			expect.objectContaining({ message: null })
		);
	});

	test('throws TEMPLATE_NOT_FOUND when template does not exist', async () => {
		dbMock.executeTakeFirst.mockResolvedValueOnce(undefined);

		await expect(
			submitTemplateReport({ templateId: 'tmpl-1' }, 'reporter-id')
		).rejects.toMatchObject({
			status: ETemplateError.TEMPLATE_NOT_FOUND.httpCode
		});
	});

	test('throws CANNOT_REPORT_OWN when reporter is the owner', async () => {
		dbMock.executeTakeFirst
			.mockResolvedValueOnce({ ...template, user_id: 'reporter-id' })
			.mockResolvedValueOnce(undefined);

		await expect(
			submitTemplateReport({ templateId: 'tmpl-1' }, 'reporter-id')
		).rejects.toMatchObject({
			status: ETemplateError.CANNOT_REPORT_OWN.httpCode
		});
	});

	test('throws ALREADY_REPORTED when a report already exists', async () => {
		dbMock.executeTakeFirst
			.mockResolvedValueOnce(template)
			.mockResolvedValueOnce({ id: 'existing-report' });

		await expect(
			submitTemplateReport({ templateId: 'tmpl-1' }, 'reporter-id')
		).rejects.toMatchObject({
			status: ETemplateError.ALREADY_REPORTED.httpCode
		});
	});

	test('throws DATABASE_ERROR when the insert fails', async () => {
		dbMock.executeTakeFirst
			.mockResolvedValueOnce(template)
			.mockResolvedValueOnce(undefined);
		dbMock.execute.mockRejectedValue(new Error('constraint violation'));

		await expect(
			submitTemplateReport({ templateId: 'tmpl-1' }, 'reporter-id')
		).rejects.toMatchObject({
			status: ECommonServerError.DATABASE_ERROR.httpCode
		});
	});
});

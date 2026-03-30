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

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ECommonServerError } from '$lib/errors';
import { ETemplateError } from '$lib/modules/board/wizard/errors';

// ─── Module mocks ────────────────────────────────────────────────────────────

/** Chainable Kysely mock — each terminal method is a vi.fn() you can configure. */
const dbMock = {
	selectFrom: vi.fn().mockReturnThis(),
	select: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	executeTakeFirst: vi.fn(),
	insertInto: vi.fn().mockReturnThis(),
	values: vi.fn().mockReturnThis(),
	execute: vi.fn(),
	deleteFrom: vi.fn().mockReturnThis(),
	updateTable: vi.fn().mockReturnThis(),
	set: vi.fn().mockReturnThis()
};

vi.mock('$lib/server/db', () => ({ db: dbMock }));

const storageMock = {
	from: vi.fn().mockReturnThis(),
	remove: vi.fn().mockResolvedValue({ error: null }),
	upload: vi.fn().mockResolvedValue({ error: null })
};

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
	paginateTemplates,
	validateCanReport,
	deleteTemplateReport,
	submitTemplateReport,
	markTemplateSafeById,
	PAGE_SIZE,
	type TemplateRow
} from '$templates/api/handlers/templates';

// ─── Factories ───────────────────────────────────────────────────────────────

/** Build a minimal TemplateRow for use in tests. */
function makeRow(overrides: Partial<TemplateRow> = {}): TemplateRow {
	return {
		id: 'row-1',
		user_id: 'user-1',
		storage_path: 'user-1/file.docx',
		safe_marked_at: null,
		created_at: '2024-01-01T00:00:00Z',
		updated_at: null,
		is_mine: false,
		profile: null,
		template_report: [],
		...overrides
	};
}

// ─── paginateTemplates ───────────────────────────────────────────────────────

describe('paginateTemplates', () => {
	const mine = makeRow({ id: 'mine-1', is_mine: true });
	const others = Array.from({ length: PAGE_SIZE + 1 }, (_, i) =>
		makeRow({ id: `other-${i}`, is_mine: false })
	);

	test('first page includes mine and PAGE_SIZE others', () => {
		const result = paginateTemplates([mine, ...others], undefined, PAGE_SIZE);
		expect(result.hasMore).toBe(true);
		expect(result.templates).toHaveLength(PAGE_SIZE + 1); // mine + PAGE_SIZE others
		expect(result.templates[0]).toEqual(mine);
	});

	test('subsequent pages exclude mine entirely', () => {
		const result = paginateTemplates(
			[mine, ...others],
			'some-cursor-id',
			PAGE_SIZE
		);
		expect(result.templates.every((t) => !t.is_mine)).toBe(true);
	});

	test('hasMore is false when others fit within page size', () => {
		const fewOthers = others.slice(0, PAGE_SIZE - 1);
		const result = paginateTemplates(
			[mine, ...fewOthers],
			undefined,
			PAGE_SIZE
		);
		expect(result.hasMore).toBe(false);
	});

	test('hasMore is true when DB returns PAGE_SIZE + 1 others', () => {
		// DB is asked for LIMIT PAGE_SIZE + 1 — if it returns that many, there is a next page
		const result = paginateTemplates(others, undefined, PAGE_SIZE);
		expect(result.hasMore).toBe(true);
		expect(result.templates.filter((t) => !t.is_mine)).toHaveLength(PAGE_SIZE);
	});

	test('empty result set returns empty templates and hasMore false', () => {
		const result = paginateTemplates([], undefined, PAGE_SIZE);
		expect(result.templates).toHaveLength(0);
		expect(result.hasMore).toBe(false);
	});

	test('only mine and no others returns mine with hasMore false', () => {
		const result = paginateTemplates([mine], undefined, PAGE_SIZE);
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
		user_id: otherUserId,
		safe_marked_at: null
	});

	test('passes silently when all conditions are satisfied', () => {
		expect(() =>
			validateCanReport(validTemplate, userId, undefined)
		).not.toThrow();
	});

	test('throws TEMPLATE_NOT_FOUND when template is undefined', () => {
		expect(() => validateCanReport(undefined, userId, undefined)).toThrow(
			ETemplateError.TEMPLATE_NOT_FOUND.message
		);
	});

	test('throws CANNOT_REPORT_OWN when user owns the template', () => {
		const ownTemplate = makeRow({ user_id: userId });
		expect(() => validateCanReport(ownTemplate, userId, undefined)).toThrow(
			ETemplateError.CANNOT_REPORT_OWN.message
		);
	});

	test('throws TEMPLATE_SAFE when safe_marked_at is set', () => {
		const safeTemplate = makeRow({
			user_id: otherUserId,
			safe_marked_at: '2024-01-01T00:00:00Z'
		});
		expect(() => validateCanReport(safeTemplate, userId, undefined)).toThrow(
			ETemplateError.TEMPLATE_SAFE.message
		);
	});

	test('throws ALREADY_REPORTED when an existing report is present', () => {
		expect(() =>
			validateCanReport(validTemplate, userId, existingReport)
		).toThrow(ETemplateError.ALREADY_REPORTED.message);
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
		).rejects.toThrow(ECommonServerError.DATABASE_ERROR.message);
	});
});

// ─── submitTemplateReport ────────────────────────────────────────────────────

describe('submitTemplateReport', () => {
	beforeEach(() => vi.clearAllMocks());

	const template = {
		id: 'tmpl-1',
		user_id: 'owner-id',
		storage_path: 'owner-id/file.docx',
		safe_marked_at: null
	};

	test('inserts report when all validation passes', async () => {
		// First executeTakeFirst → template found; second → no existing report
		dbMock.executeTakeFirst
			.mockResolvedValueOnce(template)
			.mockResolvedValueOnce(undefined);
		dbMock.execute.mockResolvedValue({});

		await submitTemplateReport(
			{ templateId: 'tmpl-1', message: 'spam' },
			'reporter-id'
		);

		expect(dbMock.insertInto).toHaveBeenCalledWith('template_report');
		expect(dbMock.values).toHaveBeenCalledWith(
			expect.objectContaining({
				template_id: 'tmpl-1',
				reporter_user_id: 'reporter-id',
				message: 'spam'
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
		).rejects.toThrow(ETemplateError.TEMPLATE_NOT_FOUND.message);
	});

	test('throws CANNOT_REPORT_OWN when reporter is the owner', async () => {
		dbMock.executeTakeFirst
			.mockResolvedValueOnce({ ...template, user_id: 'reporter-id' })
			.mockResolvedValueOnce(undefined);

		await expect(
			submitTemplateReport({ templateId: 'tmpl-1' }, 'reporter-id')
		).rejects.toThrow(ETemplateError.CANNOT_REPORT_OWN.message);
	});

	test('throws ALREADY_REPORTED when a report already exists', async () => {
		dbMock.executeTakeFirst
			.mockResolvedValueOnce(template)
			.mockResolvedValueOnce({ id: 'existing-report' });

		await expect(
			submitTemplateReport({ templateId: 'tmpl-1' }, 'reporter-id')
		).rejects.toThrow(ETemplateError.ALREADY_REPORTED.message);
	});

	test('throws DATABASE_ERROR when the insert fails', async () => {
		dbMock.executeTakeFirst
			.mockResolvedValueOnce(template)
			.mockResolvedValueOnce(undefined);
		dbMock.execute.mockRejectedValue(new Error('constraint violation'));

		await expect(
			submitTemplateReport({ templateId: 'tmpl-1' }, 'reporter-id')
		).rejects.toThrow(ECommonServerError.DATABASE_ERROR.message);
	});
});

// ─── markTemplateSafeById ────────────────────────────────────────────────────

describe('markTemplateSafeById', () => {
	beforeEach(() => vi.clearAllMocks());

	test('removes from quarantine, sets safe_marked_at, and clears reports', async () => {
		storageMock.remove.mockResolvedValue({ error: null });
		dbMock.execute.mockResolvedValue({});

		await markTemplateSafeById('tmpl-uuid');

		expect(storageMock.from).toHaveBeenCalledWith('quarantine');
		expect(storageMock.remove).toHaveBeenCalledWith(['tmpl-uuid']);
		expect(dbMock.updateTable).toHaveBeenCalledWith('template');
		expect(dbMock.set).toHaveBeenCalledWith(
			expect.objectContaining({ safe_marked_at: expect.any(String) })
		);
		expect(dbMock.deleteFrom).toHaveBeenCalledWith('template_report');
	});

	test('continues and logs to Sentry when quarantine removal fails', async () => {
		const { captureException } = await import('@sentry/sveltekit');
		storageMock.remove.mockResolvedValue({ error: new Error('storage error') });
		dbMock.execute.mockResolvedValue({});

		await markTemplateSafeById('tmpl-uuid');

		expect(captureException).toHaveBeenCalled();
		// DB update must still proceed
		expect(dbMock.updateTable).toHaveBeenCalledWith('template');
	});
});

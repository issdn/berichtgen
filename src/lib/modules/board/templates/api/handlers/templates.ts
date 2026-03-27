/**
 * Pure server-side business logic for template operations.
 *
 * This module is intentionally free of `getRequestEvent()` calls — all caller
 * context (userId, etc.) is passed explicitly so every function is unit-testable
 * with a mocked database.
 *
 * `templates.remote.ts` is the thin transport shell that wires these functions
 * to the SvelteKit remote-function transport layer.
 */

import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import {
	ECommonServerError,
	ETemplateReportError,
	throwSvelteError
} from '$lib/errors';
import { supabaseAdmin } from '$lib/server/admin';
import { db } from '$lib/server/db';
import * as Sentry from '@sentry/sveltekit';
import { sql } from 'kysely';

// ─── Constants ───────────────────────────────────────────────────────────────

export const PAGE_SIZE = 30;

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProfileRow = {
	id: string;
	full_name: string | null;
	avatar_url: string | null;
};

export type TemplateReportRow = {
	id: string;
	template_id: string;
	reporter_user_id: string;
	message: string | null;
	created_at: string;
};

export type TemplateRow = {
	id: string;
	user_id: string;
	storage_path: string;
	safe_marked_at: string | null;
	created_at: string;
	updated_at: string | null;
	is_mine: boolean;
	profile: ProfileRow | null;
	template_report: TemplateReportRow[];
};

export type FetchTemplatesParams = {
	afterId?: string;
	search?: string;
	hideReported?: boolean;
};

export type FetchTemplatesResult = {
	templates: TemplateRow[];
	hasMore: boolean;
};

// ─── Pure helpers (exported for unit testing) ────────────────────────────────

/**
 * Split a raw DB result into the paginated response shape.
 *
 * Rules:
 * - User-own templates (`is_mine`) are only included on the first page
 *   (`afterId === undefined`). Without this, they would repeat on every page.
 * - `hasMore` is derived from the DB returning `PAGE_SIZE + 1` rows so we
 *   never need a separate COUNT query.
 *
 * @param data     Raw rows from the database (may include PAGE_SIZE + 1 others).
 * @param afterId  Pagination cursor — undefined means first page.
 * @param pageSize Number of "other" rows per page.
 */
export function paginateTemplates(
	data: TemplateRow[],
	afterId: string | undefined,
	pageSize: number
): FetchTemplatesResult {
	const mine = afterId ? [] : data.filter((t) => t.is_mine);
	const others = data.filter((t) => !t.is_mine);
	const hasMore = others.length > pageSize;
	return {
		templates: [...mine, ...others.slice(0, pageSize)],
		hasMore
	};
}

/**
 * Validate that a user is allowed to report a given template.
 * Throws a typed SvelteError for each violation so callers get proper HTTP status codes.
 *
 * Extracted as a pure function so error-path logic is unit-testable without a DB.
 *
 * @param template  The template row fetched from DB, or undefined if not found.
 * @param userId    The ID of the user attempting to report.
 * @param existing  An existing report row from DB, or undefined if none.
 */
export function validateCanReport(
	template: Pick<TemplateRow, 'user_id' | 'safe_marked_at'> | undefined,
	userId: string,
	existing: { id: string } | undefined
): void {
	if (!template) throwSvelteError(ETemplateReportError.TEMPLATE_NOT_FOUND);
	if (template!.user_id === userId)
		throwSvelteError(ETemplateReportError.CANNOT_REPORT_OWN);
	if (template!.safe_marked_at !== null)
		throwSvelteError(ETemplateReportError.TEMPLATE_SAFE);
	if (existing) throwSvelteError(ETemplateReportError.ALREADY_REPORTED);
}

// ─── Database functions ───────────────────────────────────────────────────────

/**
 * Fetch a paginated, optionally filtered list of templates.
 *
 * @param params  Filter/pagination parameters.
 * @param userId  The authenticated user's ID, or undefined for anonymous visitors.
 */
export async function fetchTemplates(
	params: FetchTemplatesParams,
	userId: string | undefined
): Promise<FetchTemplatesResult> {
	const { afterId, search = '', hideReported = false } = params;

	const searchCond = search
		? sql`AND t.storage_path ILIKE ${`%/%${search}%.docx`}`
		: sql``;
	const afterIdCond = afterId ? sql`AND t.id < ${afterId}` : sql``;
	const hideReportedCond = hideReported
		? sql`AND NOT EXISTS (SELECT 1 FROM template_report WHERE template_id = t.id)`
		: sql``;

	let data: TemplateRow[];

	if (userId) {
		const result = await sql<TemplateRow>`
			(
				SELECT t.*, true AS is_mine,
				       row_to_json(p.*) AS profile,
				       COALESCE(json_agg(tr.*) FILTER (WHERE tr.id IS NOT NULL), '[]'::json) AS template_report
				FROM template t
				LEFT JOIN profile p ON p.id = t.user_id
				LEFT JOIN template_report tr ON tr.template_id = t.id
				WHERE t.user_id = ${userId} ${searchCond}
				GROUP BY t.id, p.id
			)
			UNION ALL
			(
				SELECT t.*, false AS is_mine,
				       row_to_json(p.*) AS profile,
				       COALESCE(json_agg(tr.*) FILTER (WHERE tr.id IS NOT NULL), '[]'::json) AS template_report
				FROM template t
				LEFT JOIN profile p ON p.id = t.user_id
				LEFT JOIN template_report tr ON tr.template_id = t.id
				WHERE t.user_id != ${userId} ${searchCond} ${afterIdCond} ${hideReportedCond}
				GROUP BY t.id, p.id
				ORDER BY t.id DESC
				LIMIT ${PAGE_SIZE + 1}
			)
			ORDER BY is_mine DESC, id DESC
		`.execute(db);
		data = result.rows;
	} else {
		const result = await sql<TemplateRow>`
			SELECT t.*, false AS is_mine,
			       row_to_json(p.*) AS profile,
			       COALESCE(json_agg(tr.*) FILTER (WHERE tr.id IS NOT NULL), '[]'::json) AS template_report
			FROM template t
			LEFT JOIN profile p ON p.id = t.user_id
			LEFT JOIN template_report tr ON tr.template_id = t.id
			WHERE true ${searchCond} ${afterIdCond} ${hideReportedCond}
			GROUP BY t.id, p.id
			ORDER BY t.id DESC
			LIMIT ${PAGE_SIZE + 1}
		`.execute(db);
		data = result.rows;
	}

	return paginateTemplates(data, afterId, PAGE_SIZE);
}

/**
 * Upload a .docx file to Supabase Storage and upsert the template metadata row.
 *
 * @param params  File name, MIME type, and raw bytes.
 * @param userId  Authenticated user — the file is namespaced under their ID.
 */
export async function uploadTemplateFile(
	params: { name: string; type: string; data: Uint8Array },
	userId: string
): Promise<void> {
	const storagePath = `${userId}/${params.name}`;

	const { error } = await supabaseAdmin.storage
		.from('templates')
		.upload(storagePath, params.data, {
			contentType: params.type,
			upsert: true
		});

	if (error) throwSvelteError(ECommonServerError.DATABASE_ERROR, error.message);

	const existing = await db
		.selectFrom('template')
		.select('id')
		.where('storage_path', '=', storagePath)
		.executeTakeFirst();

	if (existing) {
		await db
			.updateTable('template')
			.set({ updated_at: new Date().toISOString() })
			.where('storage_path', '=', storagePath)
			.execute();
	} else {
		await db
			.insertInto('template')
			.values({ user_id: userId, storage_path: storagePath })
			.execute();
	}
}

/**
 * Remove a template file from storage and delete its metadata row.
 *
 * @param storagePath  The storage path used as the primary key.
 */
export async function deleteTemplateFile(storagePath: string): Promise<void> {
	const { error } = await supabaseAdmin.storage
		.from('templates')
		.remove([storagePath]);
	if (error) throwSvelteError(ECommonServerError.DATABASE_ERROR, error.message);

	await db
		.deleteFrom('template')
		.where('storage_path', '=', storagePath)
		.execute();
}

/**
 * Remove the current user's report for a template.
 *
 * @param templateId  UUID of the reported template.
 * @param userId      The user who originally filed the report.
 */
export async function deleteTemplateReport(
	templateId: string,
	userId: string
): Promise<void> {
	try {
		await db
			.deleteFrom('template_report')
			.where('template_id', '=', templateId)
			.where('reporter_user_id', '=', userId)
			.execute();
	} catch {
		throwSvelteError(ECommonServerError.DATABASE_ERROR);
	}
}

/**
 * File a report against a template that violates community guidelines.
 * Also copies the file to the quarantine bucket for admin review (best-effort).
 *
 * @param params  Template UUID and optional explanatory message.
 * @param userId  The reporting user's ID.
 */
export async function submitTemplateReport(
	params: { templateId: string; message?: string },
	userId: string
): Promise<void> {
	const { templateId, message } = params;

	const template = await db
		.selectFrom('template')
		.select(['id', 'user_id', 'storage_path', 'safe_marked_at'])
		.where('id', '=', templateId)
		.executeTakeFirst();

	const existing = await db
		.selectFrom('template_report')
		.select('id')
		.where('template_id', '=', templateId)
		.where('reporter_user_id', '=', userId)
		.executeTakeFirst();

	// Throws on any validation failure
	validateCanReport(template, userId, existing);

	try {
		await db
			.insertInto('template_report')
			.values({
				template_id: templateId,
				reporter_user_id: userId,
				message: message ?? null
			})
			.execute();
	} catch (e) {
		Sentry.captureException(e);
		throwSvelteError(ECommonServerError.DATABASE_ERROR);
	}

	// Copy to quarantine for admin review — fails silently so the report is still recorded.
	try {
		const publicUrl = `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${template!.storage_path}`;
		const fileResponse = await fetch(publicUrl);
		if (fileResponse.ok) {
			const blob = await fileResponse.blob();
			const { error: uploadError } = await supabaseAdmin.storage
				.from('quarantine')
				.upload(template!.id, blob, { upsert: true });
			if (uploadError)
				Sentry.captureException(uploadError, { extra: { templateId } });
		}
	} catch (e) {
		Sentry.captureException(e, { extra: { templateId } });
	}
}

/**
 * Mark a template as admin-approved safe: remove it from quarantine and clear all reports.
 *
 * @param templateId  UUID of the template to clear.
 */
export async function markTemplateSafeById(templateId: string): Promise<void> {
	const { error } = await supabaseAdmin.storage
		.from('quarantine')
		.remove([templateId]);
	if (error) Sentry.captureException(error, { extra: { templateId } });

	await db
		.updateTable('template')
		.set({ safe_marked_at: new Date().toISOString() })
		.where('id', '=', templateId)
		.execute();

	await db
		.deleteFrom('template_report')
		.where('template_id', '=', templateId)
		.execute();
}

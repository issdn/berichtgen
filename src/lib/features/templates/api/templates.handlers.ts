import {
	BerichtgenError,
	ECommonServerError,
	throwSvelteError
} from '$lib/errors';
import { ETemplateError } from '$wizard/errors';
import { supabaseAdmin } from '$lib/server/admin';
import db from '$lib/server/db';
import * as Sentry from '@sentry/sveltekit';
import { sql } from 'kysely';
import { tryResultAsync } from '$lib/result';

export const PAGE_SIZE = 30;

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
	is_public: boolean;
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

export function validateCanReport(
	template: Pick<TemplateRow, 'user_id' | 'safe_marked_at'> | undefined,
	userId: string,
	existing: { id: string } | undefined
): void {
	if (!template) return throwSvelteError(ETemplateError.TEMPLATE_NOT_FOUND);
	if (template.user_id === userId)
		throwSvelteError(ETemplateError.CANNOT_REPORT_OWN);
	if (template.safe_marked_at !== null)
		throwSvelteError(ETemplateError.TEMPLATE_SAFE);
	if (existing) throwSvelteError(ETemplateError.ALREADY_REPORTED);
}

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
				WHERE t.user_id != ${userId} AND t.is_public = true ${searchCond} ${afterIdCond} ${hideReportedCond}
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
			WHERE t.is_public = true ${searchCond} ${afterIdCond} ${hideReportedCond}
			GROUP BY t.id, p.id
			ORDER BY t.id DESC
			LIMIT ${PAGE_SIZE + 1}
		`.execute(db);
		data = result.rows;
	}

	return paginateTemplates(data, afterId, PAGE_SIZE);
}

export async function uploadTemplateFile(
	params: { name: string; type: string; data: Uint8Array; isPublic: boolean },
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
			.set({ is_public: params.isPublic, updated_at: new Date().toISOString() })
			.where('storage_path', '=', storagePath)
			.execute();
	} else {
		await db
			.insertInto('template')
			.values({
				user_id: userId,
				storage_path: storagePath,
				is_public: params.isPublic
			})
			.execute();
	}
}

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

export async function deleteTemplateReport(
	templateId: string,
	userId: string
): Promise<void> {
	const deleteResult = await tryResultAsync(
		db
			.deleteFrom('template_report')
			.where('template_id', '=', templateId)
			.where('reporter_user_id', '=', userId)
			.execute(),
		BerichtgenError,
		ECommonServerError.DATABASE_ERROR
	);
	if (!deleteResult.ok) throwSvelteError(ECommonServerError.DATABASE_ERROR);
}

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
	validateCanReport(template, userId, existing);

	const insertResult = await tryResultAsync(
		db
			.insertInto('template_report')
			.values({
				template_id: templateId,
				reporter_user_id: userId,
				message: message ?? null
			})
			.execute(),
		BerichtgenError,
		ECommonServerError.DATABASE_ERROR
	);
	if (!insertResult.ok) {
		Sentry.captureException(insertResult.error);
		throwSvelteError(ECommonServerError.DATABASE_ERROR);
	}
}

export async function markTemplateSafeById(templateId: string): Promise<void> {
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

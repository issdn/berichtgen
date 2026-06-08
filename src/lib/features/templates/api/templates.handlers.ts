import { TEMPLATE_PAGE_SIZE } from '$lib/constants';
import { ECommonServerError } from '$lib/errors';
import { tryResultAsync } from '$lib/result';
import { supabaseAdmin } from '$lib/server/admin';
import db from '$lib/server/db';
import { svelteApiError } from '$server/errors';
import { ETemplateError } from '$wizard/errors';
import * as Sentry from '@sentry/sveltekit';
import { sql } from 'kysely';

export type FetchTemplatesParams = {
	afterId?: string;
	hideReported?: boolean;
	search?: string;
};

export type FetchTemplatesResult = {
	hasMore: boolean;
	templates: TemplateRow[];
};

export type ProfileRow = {
	avatar_url: null | string;
	full_name: null | string;
	id: string;
};

export type TemplateRow = {
	created_at: string;
	has_pending_report: boolean;
	id: string;
	is_mine: boolean;
	is_public: boolean;
	profile: null | ProfileRow;
	reported_by_me: boolean;
	safe_marked_at: null | string;
	storage_path: string;
	updated_at: null | string;
	user_id: string;
};

export async function deleteTemplateFile(storagePath: string): Promise<void> {
	const template = await db
		.selectFrom('template')
		.select(['is_public', 'storage_path'])
		.where('storage_path', '=', storagePath)
		.executeTakeFirst();

	if (!template) {
		throw svelteApiError(ETemplateError.TEMPLATE_NOT_FOUND);
	}

	const { error } = await supabaseAdmin.storage
		.from(template.is_public ? 'templates' : 'private-templates')
		.remove([template.storage_path]);
	if (error)
		throw svelteApiError({
			...ECommonServerError.DATABASE_ERROR,
			cause: error.message
		});
}

export async function deleteTemplateReport(
	templateId: string,
	userId: string
): Promise<void> {
	const deleteResult = await tryResultAsync({
		apiError: ECommonServerError.DATABASE_ERROR,
		promise: db
			.deleteFrom('template_report')
			.where('template_id', '=', templateId)
			.where('reporter_user_id', '=', userId)
			.execute()
	});
	if (!deleteResult.ok) throw svelteApiError(ECommonServerError.DATABASE_ERROR);
}

export async function fetchTemplates(
	params: FetchTemplatesParams,
	userId: string | undefined
): Promise<FetchTemplatesResult> {
	const { afterId, hideReported = false, search = '' } = params;

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
				       EXISTS(SELECT 1 FROM template_report tr_any WHERE tr_any.template_id = t.id) AS has_pending_report,
				       EXISTS(
				       	SELECT 1
				       	FROM template_report tr_me
				       	WHERE tr_me.template_id = t.id
				       		AND tr_me.reporter_user_id = ${userId}
				       ) AS reported_by_me
				FROM template t
				LEFT JOIN profile p ON p.id = t.user_id
				WHERE t.user_id = ${userId} ${searchCond}
				GROUP BY t.id, p.id
			)
			UNION ALL
			(
				SELECT t.*, false AS is_mine,
				       row_to_json(p.*) AS profile,
				       EXISTS(SELECT 1 FROM template_report tr_any WHERE tr_any.template_id = t.id) AS has_pending_report,
				       EXISTS(
				       	SELECT 1
				       	FROM template_report tr_me
				       	WHERE tr_me.template_id = t.id
				       		AND tr_me.reporter_user_id = ${userId}
				       ) AS reported_by_me
				FROM template t
				LEFT JOIN profile p ON p.id = t.user_id
				WHERE t.user_id != ${userId} AND t.is_public = true ${searchCond} ${afterIdCond} ${hideReportedCond}
				GROUP BY t.id, p.id
				ORDER BY t.id DESC
				LIMIT ${TEMPLATE_PAGE_SIZE + 1}
			)
			ORDER BY is_mine DESC, id DESC
		`.execute(db);
		data = result.rows;
	} else {
		const result = await sql<TemplateRow>`
			SELECT t.*, false AS is_mine,
			       row_to_json(p.*) AS profile,
			       EXISTS(SELECT 1 FROM template_report tr_any WHERE tr_any.template_id = t.id) AS has_pending_report,
			       false AS reported_by_me
			FROM template t
			LEFT JOIN profile p ON p.id = t.user_id
			WHERE t.is_public = true ${searchCond} ${afterIdCond} ${hideReportedCond}
			GROUP BY t.id, p.id
			ORDER BY t.id DESC
			LIMIT ${TEMPLATE_PAGE_SIZE + 1}
		`.execute(db);
		data = result.rows;
	}

	return paginateTemplates(data, afterId, TEMPLATE_PAGE_SIZE);
}

export function paginateTemplates(
	data: TemplateRow[],
	afterId: string | undefined,
	pageSize: number
): FetchTemplatesResult {
	const mine = afterId ? [] : data.filter((t) => t.is_mine);
	const others = data.filter((t) => !t.is_mine);
	const hasMore = others.length > pageSize;
	return {
		hasMore,
		templates: [...mine, ...others.slice(0, pageSize)]
	};
}

export async function submitTemplateReport(
	params: { message?: string; templateId: string },
	userId: string
): Promise<void> {
	const { message, templateId } = params;

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

	const insertResult = await tryResultAsync({
		apiError: ECommonServerError.DATABASE_ERROR,
		promise: db
			.insertInto('template_report')
			.values({
				message: message ?? null,
				reporter_user_id: userId,
				template_id: templateId
			})
			.execute()
	});
	if (!insertResult.ok) {
		Sentry.captureException(insertResult.error);
		throw svelteApiError(ECommonServerError.DATABASE_ERROR);
	}
}

export function validateCanReport(
	template: Pick<TemplateRow, 'safe_marked_at' | 'user_id'> | undefined,
	userId: string,
	existing: undefined | { id: string }
): void {
	if (!template) throw svelteApiError(ETemplateError.TEMPLATE_NOT_FOUND);
	if (template.user_id === userId)
		throw svelteApiError(ETemplateError.CANNOT_REPORT_OWN);
	if (template.safe_marked_at !== null)
		throw svelteApiError(ETemplateError.TEMPLATE_SAFE);
	if (existing) throw svelteApiError(ETemplateError.ALREADY_REPORTED);
}

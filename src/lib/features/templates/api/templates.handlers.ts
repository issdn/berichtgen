import {
	TEMPLATE_MAX_COUNT_PER_USER,
	TEMPLATE_PAGE_SIZE
} from '$lib/constants';
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

export type TemplateReportRow = {
	created_at: string;
	id: string;
	message: null | string;
	reporter_user_id: string;
	template_id: string;
};

export type TemplateRow = {
	created_at: string;
	id: string;
	is_mine: boolean;
	is_public: boolean;
	profile: null | ProfileRow;
	safe_marked_at: null | string;
	storage_path: string;
	template_report: TemplateReportRow[];
	updated_at: null | string;
	user_id: string;
};

export async function deleteTemplateFile(storagePath: string): Promise<void> {
	const { error } = await supabaseAdmin.storage
		.from('templates')
		.remove([storagePath]);
	if (error)
		throw svelteApiError({
			...ECommonServerError.DATABASE_ERROR,
			cause: error.message
		});
	await db
		.deleteFrom('template')
		.where('storage_path', '=', storagePath)
		.execute();
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
				LIMIT ${TEMPLATE_PAGE_SIZE + 1}
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
			LIMIT ${TEMPLATE_PAGE_SIZE + 1}
		`.execute(db);
		data = result.rows;
	}

	return paginateTemplates(data, afterId, TEMPLATE_PAGE_SIZE);
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

export async function uploadTemplateFile(
	params: { data: Uint8Array; isPublic: boolean; name: string; type: string },
	userId: string
): Promise<void> {
	const storagePath = `${userId}/${params.name}`;
	const { error } = await supabaseAdmin.storage
		.from('templates')
		.upload(storagePath, params.data, {
			contentType: params.type,
			upsert: true
		});
	if (error)
		throw svelteApiError({
			...ECommonServerError.DATABASE_ERROR,
			cause: error.message
		});

	const existing = await db
		.selectFrom('template')
		.select('id')
		.where('storage_path', '=', storagePath)
		.executeTakeFirst();

	await validateCanCreateTemplate({
		existingTemplateId: existing?.id,
		userId
	});

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
				is_public: params.isPublic,
				storage_path: storagePath,
				user_id: userId
			})
			.execute();
	}
}

/**
 * Enforces per-user template creation limits while allowing overwrite of existing paths.
 */
export async function validateCanCreateTemplate({
	existingTemplateId,
	userId
}: {
	existingTemplateId?: string;
	userId: string;
}): Promise<void> {
	if (existingTemplateId) return;
	const templateCount = await db
		.selectFrom('template')
		.select((eb) => eb.fn.count('id').as('count'))
		.where('user_id', '=', userId)
		.executeTakeFirst();
	const count = Number(templateCount?.count ?? 0);
	if (count >= TEMPLATE_MAX_COUNT_PER_USER) {
		throw svelteApiError(ETemplateError.MAX_TEMPLATES_REACHED);
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

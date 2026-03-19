import { query, command } from '$app/server';
import { getRequestEvent } from '$app/server';
import { z } from 'zod';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import * as Sentry from '@sentry/sveltekit';
import { supabaseAdmin } from '$lib/server/admin';
import { db } from '$lib/server/db';
import { sql } from 'kysely';
import {
	ECommonServerError,
	ETemplateReportError,
	throwSvelteError
} from '../errors';

const PAGE_SIZE = 9;

type ProfileRow = {
	id: string;
	full_name: string | null;
	avatar_url: string | null;
};

type TemplateReportRow = {
	id: string;
	template_id: string;
	reporter_user_id: string;
	message: string | null;
	created_at: string;
};

type TemplateRow = {
	id: string;
	user_id: string;
	storage_path: string;
	thumbnail_path: string | null;
	safe_marked_at: string | null;
	created_at: string;
	updated_at: string | null;
	is_mine: boolean;
	profile: ProfileRow | null;
	template_report: TemplateReportRow[];
};

export const getTemplates = query(
	z.object({
		afterId: z.uuid().optional(),
		search: z.string().optional().default(''),
		hideReported: z.boolean().optional().default(false)
	}),
	async ({ afterId, search, hideReported }) => {
		const {
			locals: { user }
		} = getRequestEvent();

		const searchCond = search
			? sql`AND t.storage_path ILIKE ${`%/%${search}%.docx`}`
			: sql``;
		const afterIdCond = afterId ? sql`AND t.id < ${afterId}` : sql``;
		const hideReportedCond = hideReported
			? sql`AND NOT EXISTS (SELECT 1 FROM template_report WHERE template_id = t.id)`
			: sql``;

		let data: TemplateRow[];

		if (user) {
			const result = await sql<TemplateRow>`
				(
					SELECT t.*, true AS is_mine,
					       row_to_json(p.*) AS profile,
					       COALESCE(json_agg(tr.*) FILTER (WHERE tr.id IS NOT NULL), '[]'::json) AS template_report
					FROM template t
					LEFT JOIN profile p ON p.id = t.user_id
					LEFT JOIN template_report tr ON tr.template_id = t.id
					WHERE t.user_id = ${user.id} ${searchCond}
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
					WHERE t.user_id != ${user.id} ${searchCond} ${afterIdCond} ${hideReportedCond}
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

		const mine = data.filter((t) => t.is_mine);
		const others = data.filter((t) => !t.is_mine);
		const hasMore = others.length > PAGE_SIZE;

		return {
			templates: [...mine, ...others.slice(0, PAGE_SIZE)],
			hasMore
		};
	}
);

/** Uploads a .docx template file and creates or updates the template metadata row. */
export const uploadTemplate = command(
	z.object({
		name: z.string().min(1),
		type: z.string().min(1),
		data: z.instanceof(Uint8Array)
	}),
	async ({ name, type, data }) => {
		const {
			locals: { user }
		} = getRequestEvent();

		const storagePath = `${user!.id}/${name}`;

		const { error } = await supabaseAdmin.storage
			.from('templates')
			.upload(storagePath, data, { contentType: type, upsert: true });

		if (error)
			throwSvelteError(ECommonServerError.DATABASE_ERROR, error.message);

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
				.values({ user_id: user!.id, storage_path: storagePath })
				.execute();
		}
	}
);

/** Removes a template file from storage and deletes its metadata row. */
export const deleteTemplate = command(
	z.object({ storagePath: z.string().min(1) }),
	async ({ storagePath }) => {
		const { error } = await supabaseAdmin.storage
			.from('templates')
			.remove([storagePath]);
		if (error)
			throwSvelteError(ECommonServerError.DATABASE_ERROR, error.message);

		await db
			.deleteFrom('template')
			.where('storage_path', '=', storagePath)
			.execute();
	}
);

/** Removes the current user's report for a template. */
export const deleteReport = command(
	z.object({ templateId: z.uuid() }),
	async ({ templateId }) => {
		const {
			locals: { user }
		} = getRequestEvent();

		try {
			await db
				.deleteFrom('template_report')
				.where('template_id', '=', templateId)
				.where('reporter_user_id', '=', user!.id)
				.execute();
		} catch {
			throwSvelteError(ECommonServerError.DATABASE_ERROR);
		}
	}
);

/** Submits a report for a template that violates community guidelines. */
export const reportTemplate = command(
	z.object({
		templateId: z.uuid(),
		message: z.string().max(1000).optional()
	}),
	async ({ templateId, message }) => {
		const {
			locals: { user }
		} = getRequestEvent();

		const template = await db
			.selectFrom('template')
			.select(['id', 'user_id', 'storage_path', 'safe_marked_at'])
			.where('id', '=', templateId)
			.executeTakeFirst();

		if (!template) throwSvelteError(ETemplateReportError.TEMPLATE_NOT_FOUND);
		if (template!.user_id === user!.id)
			throwSvelteError(ETemplateReportError.CANNOT_REPORT_OWN);
		if (template!.safe_marked_at !== null)
			throwSvelteError(ETemplateReportError.TEMPLATE_SAFE);

		const existing = await db
			.selectFrom('template_report')
			.select('id')
			.where('template_id', '=', templateId)
			.where('reporter_user_id', '=', user!.id)
			.executeTakeFirst();

		if (existing) throwSvelteError(ETemplateReportError.ALREADY_REPORTED);

		try {
			await db
				.insertInto('template_report')
				.values({
					template_id: templateId,
					reporter_user_id: user!.id,
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
);

/** Marks a template as safe: removes it from quarantine and clears all reports. */
export const markTemplateSafe = command(
	z.object({ templateId: z.uuid() }),
	async ({ templateId }) => {
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
);

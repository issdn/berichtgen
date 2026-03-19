import { query, command } from '$app/server';
import { getRequestEvent } from '$app/server';
import { z } from 'zod';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import * as Sentry from '@sentry/sveltekit';
import { supabaseAdmin } from '$lib/server/admin';
import { db } from '$lib/server/db';
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/postgres';
import {
	ECommonServerError,
	ETemplateReportError,
	throwSvelteError
} from '../errors';

const PAGE_SIZE = 9;

export const getTemplates = query(
	z.object({
		afterId: z.uuid().optional(),
		search: z.string().optional().default(''),
		hideReported: z.boolean().optional().default(false),
		onlyMine: z.boolean().optional().default(false)
	}),
	async ({ afterId, search, hideReported, onlyMine }) => {
		const {
			locals: { user }
		} = getRequestEvent();

		let query = db
			.selectFrom('template as t')
			.selectAll('t')
			.select((eb) => [
				jsonObjectFrom(
					eb
						.selectFrom('profile')
						.selectAll()
						.whereRef('profile.id', '=', 't.user_id')
				).as('profile'),
				jsonArrayFrom(
					eb
						.selectFrom('template_report')
						.selectAll()
						.whereRef('template_report.template_id', '=', 't.id')
				).as('template_report')
			])
			.orderBy('t.id', 'desc')
			.limit(PAGE_SIZE + 1);

		if (search) {
			query = query.where('t.storage_path', 'ilike', `%/%${search}%.docx`);
		}
		if (onlyMine && user) {
			query = query.where('t.user_id', '=', user.id);
		}
		if (afterId) {
			query = query.where('t.id', '<', afterId);
		}
		if (hideReported) {
			query = query.where((eb) =>
				eb.not(
					eb.exists(
						eb
							.selectFrom('template_report')
							.select('id')
							.whereRef('template_report.template_id', '=', 't.id')
					)
				)
			);
		}

		const data = await query.execute();
		const hasMore = data.length > PAGE_SIZE;

		return { templates: hasMore ? data.slice(0, PAGE_SIZE) : data, hasMore };
	}
);

/** Uploads a .docx template file and creates the template metadata row. */
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
			.upload(storagePath, data, { contentType: type });
		console.log(error);
		if (error)
			throwSvelteError(ECommonServerError.DATABASE_ERROR, error.message);

		await db
			.insertInto('template')
			.values({ user_id: user!.id, storage_path: storagePath })
			.execute();
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

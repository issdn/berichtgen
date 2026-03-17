import { query, command } from '$app/server';
import { getRequestEvent } from '$app/server';
import { z } from 'zod';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import * as Sentry from '@sentry/sveltekit';
import { supabaseAdmin } from '$lib/server/admin';
import {
	ECommonServerError,
	ETemplateReportError,
	throwSvelteError
} from '../errors';

const argsSchema = z.object({
	limit: z.number().int().min(1).max(100),
	search: z.string().optional().default(''),
	hideReported: z.boolean().optional().default(false),
	onlyMine: z.boolean().optional().default(false)
});

export const getTemplates = query(
	argsSchema,
	async ({ limit, search, hideReported, onlyMine }) => {
		const {
			locals: { supabase }
		} = getRequestEvent();

		const { data, error } = await supabase
			.rpc('get_templates', {
				limit_val: limit,
				search_val: search,
				only_unreported: hideReported,
				only_mine: onlyMine
			})
			.select('*, profile(*), template_report!left(*)');

		if (error)
			return throwSvelteError(ECommonServerError.INTERNAL_ERROR, error.message);

		const hasMore = data.length === limit;

		return { templates: data, hasMore };
	}
);

/** Uploads a .docx template file into the authenticated user's storage folder. */
export const uploadTemplate = command(
	z.object({
		name: z.string().min(1),
		type: z.string().min(1),
		data: z.instanceof(Uint8Array)
	}),
	async ({ name, type, data }) => {
		const {
			locals: { supabase, user }
		} = getRequestEvent();

		const { error } = await supabase.storage
			.from('templates')
			.upload(`${user!.id}/${name}`, data, { contentType: type });

		if (error)
			throwSvelteError(ECommonServerError.DATABASE_ERROR, error.message);
	}
);

/** Permanently removes a template file from storage. */
export const deleteTemplate = command(
	z.object({ storagePath: z.string().min(1) }),
	async ({ storagePath }) => {
		const {
			locals: { supabase }
		} = getRequestEvent();

		const { error } = await supabase.storage
			.from('templates')
			.remove([storagePath]);
		if (error)
			throwSvelteError(ECommonServerError.DATABASE_ERROR, error.message);
	}
);

/** Removes the current user's report for a template. */
export const deleteReport = command(
	z.object({ templateId: z.uuid() }),
	async ({ templateId }) => {
		const {
			locals: { supabase, user }
		} = getRequestEvent();

		const { error } = await supabase
			.from('template_report')
			.delete()
			.eq('template_id', templateId)
			.eq('reporter_user_id', user!.id);

		if (error) throwSvelteError(ECommonServerError.DATABASE_ERROR);
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
			locals: { supabase, user }
		} = getRequestEvent();

		const { data: template, error: templateError } = await supabase
			.from('template')
			.select('id, user_id, storage_path, safe_marked_at')
			.eq('id', templateId)
			.single();

		if (templateError || !template)
			throwSvelteError(ETemplateReportError.TEMPLATE_NOT_FOUND);
		if (template!.user_id === user!.id)
			throwSvelteError(ETemplateReportError.CANNOT_REPORT_OWN);
		if (template!.safe_marked_at !== null)
			throwSvelteError(ETemplateReportError.TEMPLATE_SAFE);

		const { data: existing } = await supabase
			.from('template_report')
			.select('id')
			.eq('template_id', templateId)
			.eq('reporter_user_id', user!.id)
			.maybeSingle();

		if (existing) throwSvelteError(ETemplateReportError.ALREADY_REPORTED);

		const { error: insertError } = await supabase
			.from('template_report')
			.insert({
				template_id: templateId,
				reporter_user_id: user!.id,
				message: message || null
			});

		if (insertError) {
			Sentry.captureException(insertError);
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

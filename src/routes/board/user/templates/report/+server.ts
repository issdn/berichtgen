import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { supabaseAdmin } from '$src/lib/server/admin';
import {
	ECommonServerError,
	ETemplateReportError,
	throwSvelteError
} from '$src/lib/errors';
import * as Sentry from '@sentry/sveltekit';

const reportSchema = z.object({
	template_id: z.uuid(),
	message: z.string().max(1000).optional()
});

export const POST: RequestHandler = async ({
	request,
	locals: { user, supabase }
}) => {
	const body = await request.json();
	const parsed = reportSchema.safeParse(body);

	if (!parsed.success) {
		return throwSvelteError(ECommonServerError.VALIDATION_ERROR);
	}

	const { template_id, message } = parsed.data;

	// Fetch the template to validate reportability
	const { data: template, error: templateError } = await supabase
		.from('template')
		.select('id, user_id, storage_path, safe_marked_at')
		.eq('id', template_id)
		.single();

	if (templateError || !template) {
		return throwSvelteError(ETemplateReportError.TEMPLATE_NOT_FOUND);
	}

	if (template.user_id === user!.id) {
		return throwSvelteError(ETemplateReportError.CANNOT_REPORT_OWN);
	}

	if (template.safe_marked_at !== null) {
		return throwSvelteError(ETemplateReportError.TEMPLATE_SAFE);
	}

	// Check for duplicate pending report from this user
	const { data: existing } = await supabase
		.from('template_report')
		.select('id')
		.eq('template_id', template_id)
		.eq('reporter_user_id', user!.id)
		.maybeSingle();

	if (existing) {
		return throwSvelteError(ETemplateReportError.ALREADY_REPORTED);
	}

	// Insert the report
	const { error: insertError } = await supabase.from('template_report').insert({
		template_id,
		reporter_user_id: user!.id,
		message: message ?? null
	});

	if (insertError) {
		Sentry.captureException(insertError);
		return throwSvelteError(ECommonServerError.DATABASE_ERROR);
	}

	// Copy the template file to the quarantine bucket for admin review.
	// Uses the public URL to download (templates bucket is public).
	// Fails silently — the report is already recorded.
	try {
		const publicUrl = `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${template.storage_path}`;
		const fileResponse = await fetch(publicUrl);

		if (fileResponse.ok) {
			const blob = await fileResponse.blob();
			const { error: uploadError } = await supabaseAdmin.storage
				.from('quarantine')
				.upload(template.id, blob, { upsert: true });

			if (uploadError) {
				Sentry.captureException(uploadError, { extra: { template_id } });
			}
		}
	} catch (e) {
		Sentry.captureException(e, { extra: { template_id } });
	}

	return json({ success: true }, { status: 201 });
};

/**
 * Remote function transport shell for template operations.
 *
 * This file is intentionally thin: schema validation, request context,
 * optional rate limiting, then delegation to handlers.
 */

import { getRequestEvent, query } from '$app/server';
import { withRateLimit } from '$lib/server/rate_limit';
import { guardedCommand } from '$lib/server/remote';
import {
	deleteTemplateFile,
	deleteTemplateReport,
	fetchTemplates,
	submitTemplateReport
} from '$templates/api/templates.handlers';
import * as z from 'zod';

export const getTemplates = query(
	z.object({
		afterId: z.uuid().optional(),
		hideReported: z.boolean().optional().default(false),
		search: z.string().optional().default('')
	}),
	async (params) => {
		const {
			locals: { user }
		} = getRequestEvent();
		return fetchTemplates(params, user?.id);
	}
);

export const deleteTemplate = guardedCommand(
	z.object({ storagePath: z.string().min(1) }),
	async ({ storagePath }) => deleteTemplateFile(storagePath)
);

export const deleteReport = guardedCommand(
	z.object({ templateId: z.uuid() }),
	async ({ templateId }) => {
		const {
			locals: { user }
		} = getRequestEvent();
		return deleteTemplateReport(templateId, user!.id);
	}
);

export const reportTemplate = guardedCommand(
	z.object({
		message: z.string().max(1000).optional(),
		templateId: z.uuid()
	}),
	async (params) =>
		withRateLimit({
			policyId: 'report-template',
			fn: async () => {
				const {
					locals: { user }
				} = getRequestEvent();
				return submitTemplateReport(params, user!.id);
			}
		})
);

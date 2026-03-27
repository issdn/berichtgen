/**
 * Remote function transport shell for template operations.
 *
 * This file is intentionally thin — it only handles:
 *   1. Input schema validation (via zod)
 *   2. Extracting request context (`user`) from `getRequestEvent()`
 *   3. Delegating to the pure business-logic functions in `$lib/server/templates`
 *
 * All actual logic lives in `$lib/server/templates.ts` so it can be unit-tested
 * without the remote-function transport layer.
 */

import { getRequestEvent, query } from '$app/server';
import { guardedCommand } from '$lib/server/remote';
import {
	deleteTemplateFile,
	deleteTemplateReport,
	fetchTemplates,
	markTemplateSafeById,
	submitTemplateReport,
	uploadTemplateFile
} from '$templates/api/handlers/templates';
import * as z from 'zod';

export const getTemplates = query(
	z.object({
		afterId: z.uuid().optional(),
		search: z.string().optional().default(''),
		hideReported: z.boolean().optional().default(false)
	}),
	async (params) => {
		const {
			locals: { user }
		} = getRequestEvent();
		return fetchTemplates(params, user?.id);
	}
);

export const uploadTemplate = guardedCommand(
	z.object({
		name: z.string().min(1),
		type: z.string().min(1),
		data: z.instanceof(Uint8Array)
	}),
	async (params) => {
		const {
			locals: { user }
		} = getRequestEvent();
		return uploadTemplateFile(params, user!.id);
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
		templateId: z.uuid(),
		message: z.string().max(1000).optional()
	}),
	async (params) => {
		const {
			locals: { user }
		} = getRequestEvent();
		return submitTemplateReport(params, user!.id);
	}
);

export const markTemplateSafe = guardedCommand(
	z.object({ templateId: z.uuid() }),
	async ({ templateId }) => markTemplateSafeById(templateId)
);

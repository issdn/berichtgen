/**
 * Remote function transport shell for wizard operations.
 */

import { getRequestEvent, query } from '$app/server';
import { ECommonServerError } from '$lib/errors';
import { tryResultAsync } from '$lib/result';
import { guardedCommand } from '$lib/server/remote';
import { svelteApiError } from '$server/errors';
import {
	checkPreferredTemplateExists,
	requestGcsUploadTarget,
	runBatchCompletion
} from '$wizard/api/wizard.handlers';
import {
	batchCompletionApiSchema,
	uploadUrlRequestSchema
} from '$wizard/schemas';
import * as z from 'zod';

export const checkPreferredTemplate = query(
	z.object({ storagePath: z.string().min(1) }),
	async ({ storagePath }) => {
		const exists = await checkPreferredTemplateExists(storagePath);
		return { exists };
	}
);

/**
 * Creates (or reuses) a signed GCS upload URL for wizard file upload.
 */
export const requestGcsUploadCommand = guardedCommand(
	uploadUrlRequestSchema,
	async ({ contentType, fullFilePath }) => {
		const {
			locals: { user }
		} = getRequestEvent();

		const storageResult = await tryResultAsync({
			apiError: ECommonServerError.INTERNAL_ERROR,
			promise: requestGcsUploadTarget({
				contentType,
				fullFilePath,
				userId: user!.id
			})
		});
		if (!storageResult.ok) throw svelteApiError(storageResult.error.apiError);
		return storageResult.data;
	}
);

/**
 * Executes one batch completion request via remote command.
 */
export const submitBatchCompletionCommand = guardedCommand(
	batchCompletionApiSchema,
	async ({ items }) => {
		const {
			locals: { user }
		} = getRequestEvent();
		if (!user) throw svelteApiError(ECommonServerError.UNAUTHORIZED);

		const result = await tryResultAsync({
			apiError: ECommonServerError.INTERNAL_ERROR,
			promise: runBatchCompletion(items, user!.id)
		});
		if (!result.ok) {
			throw svelteApiError(result.error.apiError);
		}

		return result.data;
	}
);

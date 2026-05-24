/**
 * Remote function transport shell for wizard operations.
 */

import { getRequestEvent, query } from '$app/server';
import { GCS_BUCKET_NAME, GCS_SERVICE_ACCOUNT_KEY } from '$env/static/private';
import {
	BerichtgenError,
	ECommonServerError,
	errorByHttpCode,
	svelteApiError
} from '$lib/errors';
import {
	errResult,
	okResult,
	type Result,
	tryResult,
	tryResultAsync
} from '$lib/result';
import { guardedCommand } from '$lib/server/remote';
import {
	checkPreferredTemplateExists,
	runBatchCompletion
} from '$wizard/api/wizard.handlers';
import { EGCSError, WizardError } from '$wizard/errors';
import {
	batchCompletionApiSchema,
	uploadUrlRequestSchema
} from '$wizard/schemas';
import { Storage } from '@google-cloud/storage';
import { createHash } from 'node:crypto';
import * as z from 'zod';

export const checkPreferredTemplate = query(
	z.object({ storagePath: z.string().min(1) }),
	async ({ storagePath }) => {
		const exists = await checkPreferredTemplateExists(storagePath);
		return { exists };
	}
);

async function createSignedUploadPayload({
	contentType,
	fileUri,
	objectPath,
	storage
}: {
	contentType: string;
	fileUri: string;
	objectPath: string;
	storage: Storage;
}): Promise<{ fileUri: string; signedUrl?: string; }> {
	const file = storage.bucket(GCS_BUCKET_NAME).file(objectPath);
	const [exists] = await file.exists();
	if (exists) return { fileUri };

	const [signedUrl] = await file.getSignedUrl({
		action: 'write',
		contentType,
		expires: Date.now() + 5 * 60 * 1000,
		extensionHeaders: {
			'x-goog-if-generation-match': '0'
		},
		version: 'v4'
	});
	return { fileUri, signedUrl };
}

async function createSignedUploadResult({
	contentType,
	fileUri,
	objectPath,
	storage
}: {
	contentType: string;
	fileUri: string;
	objectPath: string;
	storage: Storage;
}): Promise<Result<{ fileUri: string; signedUrl?: string; }>> {
	const signedResult = await tryResultAsync(
		createSignedUploadPayload({ contentType, fileUri, objectPath, storage }),
		BerichtgenError,
		EGCSError.INTERNAL_SERVER_ERROR
	);
	if (!signedResult.ok) {
		const e = signedResult.error.cause;
		const httpCode =
			e !== null && typeof e === 'object' && 'code' in e
				? Number((e as { code: unknown }).code)
				: 500;

		if (httpCode === 412) return okResult({ fileUri });

		const gcsError =
			errorByHttpCode(EGCSError, httpCode) ?? EGCSError.INTERNAL_SERVER_ERROR;
		return errResult(WizardError, gcsError, signedResult.error);
	}
	return okResult(signedResult.data);
}

function createStorageClient(): Storage {
	const credentials = JSON.parse(GCS_SERVICE_ACCOUNT_KEY.replace(/\n/g, ''));
	return new Storage({ credentials });
}

/**
 * Creates (or reuses) a signed GCS upload URL for wizard file upload.
 */
export const requestGcsUploadCommand = guardedCommand(
	uploadUrlRequestSchema,
	async ({ contentType, fullFilePath }) => {
		const {
			locals: { user }
		} = getRequestEvent();

		if (!GCS_BUCKET_NAME)
			throw svelteApiError(ECommonServerError.INTERNAL_ERROR);

		const normalizedFullPath = fullFilePath.replace(/\\/g, '/');
		const hash = createHash('sha256').update(normalizedFullPath).digest('hex');
		const objectPath = `${user!.id}/${hash}`;
		const fileUri = `gs://${GCS_BUCKET_NAME}/${objectPath}`;

		const storageResult = await tryResult(
			() => createStorageClient(),
			WizardError,
			ECommonServerError.INTERNAL_ERROR
		);
		if (!storageResult.ok) throw svelteApiError(storageResult.error.apiError);

		const signedUploadResult = await createSignedUploadResult({
			contentType,
			fileUri,
			objectPath,
			storage: storageResult.data
		});
		if (!signedUploadResult.ok)
			throw svelteApiError(signedUploadResult.error.apiError);

		return signedUploadResult.data;
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

		const result = await tryResultAsync(
			runBatchCompletion(items, user!.id),
			BerichtgenError,
			ECommonServerError.INTERNAL_ERROR
		);
		if (!result.ok) {
			throw svelteApiError(result.error.apiError);
		}
		return result.data;
	}
);

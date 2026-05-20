/**
 * Remote function transport shell for wizard operations.
 */

import { getRequestEvent, query } from '$app/server';
import { guardedCommand } from '$lib/server/remote';
import {
	BerichtgenError,
	ECommonServerError,
	errorByHttpCode,
	throwSvelteError
} from '$lib/errors';
import { checkPreferredTemplateExists } from '$wizard/api/handlers/wizard';
import { EGCSError, WizardError } from '$wizard/errors';
import {
	batchCompletionApiSchema,
	type BatchCompletionApiResponse,
	uploadUrlRequestSchema
} from '$wizard/schemas';
import { Storage } from '@google-cloud/storage';
import { createHash } from 'node:crypto';
import {
	errResult,
	okResult,
	tryResult,
	tryResultAsync,
	type Result
} from '$lib/result';
import { GCS_BUCKET_NAME, GCS_SERVICE_ACCOUNT_KEY } from '$env/static/private';
import * as z from 'zod';

export const checkPreferredTemplate = query(
	z.object({ storagePath: z.string().min(1) }),
	async ({ storagePath }) => {
		const exists = await checkPreferredTemplateExists(storagePath);
		return { exists };
	}
);

function createStorageClient(): Storage {
	const credentials = JSON.parse(GCS_SERVICE_ACCOUNT_KEY.replace(/\n/g, ''));
	return new Storage({ credentials });
}

async function createSignedUploadPayload({
	storage,
	objectPath,
	contentType,
	fileUri
}: {
	storage: Storage;
	objectPath: string;
	contentType: string;
	fileUri: string;
}): Promise<{ signedUrl?: string; fileUri: string }> {
	const file = storage.bucket(GCS_BUCKET_NAME).file(objectPath);
	const [exists] = await file.exists();
	if (exists) return { fileUri };

	const [signedUrl] = await file.getSignedUrl({
		version: 'v4',
		action: 'write',
		expires: Date.now() + 5 * 60 * 1000,
		contentType,
		extensionHeaders: {
			'x-goog-if-generation-match': '0'
		}
	});
	return { signedUrl, fileUri };
}

async function createSignedUploadResult({
	storage,
	objectPath,
	contentType,
	fileUri
}: {
	storage: Storage;
	objectPath: string;
	contentType: string;
	fileUri: string;
}): Promise<Result<{ signedUrl?: string; fileUri: string }>> {
	const signedResult = await tryResultAsync(
		createSignedUploadPayload({ storage, objectPath, contentType, fileUri }),
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

/**
 * Creates (or reuses) a signed GCS upload URL for wizard file upload.
 */
export const requestGcsUploadCommand = guardedCommand(
	uploadUrlRequestSchema,
	async ({ fullFilePath, contentType }) => {
		const {
			locals: { user }
		} = getRequestEvent();

		if (!GCS_BUCKET_NAME) throwSvelteError(ECommonServerError.INTERNAL_ERROR);

		const normalizedFullPath = fullFilePath.replace(/\\/g, '/');
		const hash = createHash('sha256').update(normalizedFullPath).digest('hex');
		const objectPath = `${user!.id}/${hash}`;
		const fileUri = `gs://${GCS_BUCKET_NAME}/${objectPath}`;

		const storageResult = await tryResult(
			() => createStorageClient(),
			WizardError,
			ECommonServerError.INTERNAL_ERROR
		);
		if (!storageResult.ok)
			return throwSvelteError(storageResult.error.apiError);

		const signedUploadResult = await createSignedUploadResult({
			storage: storageResult.data,
			objectPath,
			contentType,
			fileUri
		});
		if (!signedUploadResult.ok)
			return throwSvelteError(signedUploadResult.error.apiError);

		return signedUploadResult.data;
	}
);

/**
 * Executes one batch completion request via the existing completion route.
 */
export const submitBatchCompletionCommand = guardedCommand(
	batchCompletionApiSchema,
	async ({ items }) => {
		const { fetch } = getRequestEvent();
		const response = await fetch('/board/user/completion', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ items })
		});
		const data = await response.json();
		if (!response.ok) {
			const code =
				typeof data === 'object' &&
				data !== null &&
				'code' in data &&
				typeof (data as { code?: unknown }).code === 'string'
					? (data as { code: string }).code
					: undefined;

			throwSvelteError(
				code
					? WizardError.fromCode(code).apiError
					: ECommonServerError.INTERNAL_ERROR
			);
		}

		return data as BatchCompletionApiResponse;
	}
);

import { GCS_SERVICE_ACCOUNT_KEY, GCS_BUCKET_NAME } from '$env/static/private';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import {
	ECommonServerError,
	errorByHttpCode,
	throwSvelteError
} from '$lib/errors';
import { EGCSError } from '$wizard/errors';
import { uploadUrlRequestSchema } from '$wizard/schemas';
import { Storage } from '@google-cloud/storage';
import { createHash } from 'node:crypto';
import { errResult, okResult, tryResult, type Result } from '$lib/result';
import { WizardError } from '$wizard/errors';

/**
 * Creates a Google Cloud Storage client authenticated with the service account
 * key stored in `GCS_SERVICE_ACCOUNT_KEY`.
 *
 * Will throw if the environment variable is missing or contains invalid JSON.
 */
function createStorageClient(): Storage {
	const credentials = JSON.parse(GCS_SERVICE_ACCOUNT_KEY.replace(/\n/g, ''));

	return new Storage({ credentials });
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
	try {
		const file = storage.bucket(GCS_BUCKET_NAME).file(objectPath);
		const [exists] = await file.exists();
		if (exists) {
			return okResult({ fileUri });
		}

		const [signedUrl] = await file.getSignedUrl({
			version: 'v4',
			action: 'write',
			expires: Date.now() + 5 * 60 * 1000, // 5 minutes
			contentType,
			extensionHeaders: {
				'x-goog-if-generation-match': '0'
			}
		});
		return okResult({ signedUrl, fileUri });
	} catch (e) {
		const httpCode =
			e !== null && typeof e === 'object' && 'code' in e
				? Number((e as { code: unknown }).code)
				: 500;

		if (httpCode === 412) {
			return okResult({ fileUri });
		}

		const gcsError =
			errorByHttpCode(EGCSError, httpCode) ?? EGCSError.INTERNAL_SERVER_ERROR;
		return errResult(WizardError, gcsError, e);
	}
}

/**
 * `POST /board/user/upload-url`
 *
 * Generates a short-lived (5-minute) signed PUT URL so the client can upload
 * a file directly to Google Cloud Storage without passing through Vercel.
 *
 * Request body: `{ fileName: string, fullFilePath: string, contentType: string, fileSize: number }`
 * Response:     `{ signedUrl?: string, fileUri: string }`
 *
 * The `fileUri` is a `gs://` URI that can be passed directly to the Gemini API.
 */
export const POST: RequestHandler = async ({ request, locals: { user } }) => {
	if (!user) return throwSvelteError(ECommonServerError.UNAUTHORIZED);

	if (!GCS_BUCKET_NAME)
		return throwSvelteError(ECommonServerError.INTERNAL_ERROR);

	const body = await request.json();
	const parsed = uploadUrlRequestSchema.safeParse(body);
	if (!parsed.success)
		return throwSvelteError(ECommonServerError.VALIDATION_ERROR);

	const {
		fileName: _fileName,
		fullFilePath,
		contentType,
		fileSize: _fileSize
	} = parsed.data;

	// Deterministic per-user object key so retries can reuse previously uploaded
	// files when completion failed and the object is still present.
	const normalizedFullPath = fullFilePath.replace(/\\/g, '/');
	const hash = createHash('sha256').update(normalizedFullPath).digest('hex');
	const objectPath = `${user.id}/${hash}`;
	const fileUri = `gs://${GCS_BUCKET_NAME}/${objectPath}`;

	const storageResult = await tryResult(
		Promise.resolve(createStorageClient()),
		WizardError,
		ECommonServerError.INTERNAL_ERROR
	);
	if (!storageResult.ok) return throwSvelteError(storageResult.error.apiError);

	const signedUploadResult = await createSignedUploadResult({
		storage: storageResult.data,
		objectPath,
		contentType,
		fileUri
	});
	if (!signedUploadResult.ok)
		return throwSvelteError(signedUploadResult.error.apiError);

	return json(signedUploadResult.data);
};

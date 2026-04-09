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

/**
 * `POST /board/user/upload-url`
 *
 * Generates a short-lived (15-minute) signed PUT URL so the client can upload
 * a file directly to Google Cloud Storage without passing through Vercel.
 *
 * Request body: `{ fileName: string, contentType: string, fileSize: number }`
 * Response:     `{ signedUrl: string, fileUri: string }`
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

	const { fileName, contentType, fileSize: _fileSize } = parsed.data;

	// Use a per-user, UUID-namespaced path to avoid collisions and allow
	// coarse-grained IAM policies scoped to `uploads/{userId}/`.
	const objectPath = `uploads/${user.id}/${crypto.randomUUID()}/${fileName}`;

	let storage: Storage;
	try {
		storage = createStorageClient();
	} catch {
		return throwSvelteError(ECommonServerError.INTERNAL_ERROR);
	}

	try {
		const [signedUrl] = await storage
			.bucket(GCS_BUCKET_NAME)
			.file(objectPath)
			.getSignedUrl({
				version: 'v4',
				action: 'write',
				expires: Date.now() + 15 * 60 * 1000, // 15 minutes
				contentType
			});
		const fileUri = `gs://${GCS_BUCKET_NAME}/${objectPath}`;
		return json({ signedUrl, fileUri });
	} catch (e) {
		// The GCS SDK sets `code` to the HTTP status of the failed API call.
		const httpCode =
			e !== null && typeof e === 'object' && 'code' in e
				? Number((e as { code: unknown }).code)
				: 500;

		const gcsError =
			errorByHttpCode(EGCSError, httpCode) ?? EGCSError.INTERNAL_SERVER_ERROR;
		return throwSvelteError(gcsError);
	}
};

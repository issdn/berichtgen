import { requestGcsUploadCommand } from '$wizard/api/wizard.remote';
import { WizardError, EFileRoutingError, EGCSError } from '$wizard/errors';
import { errorByHttpCode } from '$lib/errors';
import { errResult, type Result, okResult, tryResultAsync } from '$lib/result';
import { FileTypes } from '$wizard/enums';
import { fullResultSchema } from '$wizard/schemas';
import type { ResultEntry } from '$wizard/types';

/** Maps a GCS HTTP response status to the matching {@link EGCSError} entry. */
function gcsErrorFromStatus(status: number): WizardError {
	return new WizardError(
		errorByHttpCode(EGCSError, status) ?? EGCSError.INTERNAL_SERVER_ERROR
	);
}

/** Files at or below this size are sent inline (base64) in the completion request. */
export const INLINE_MAX_BYTES = 1 * 1024 * 1024; // 1 MB

/** Strict max file size for wizard processing. */
export const GCS_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

/** The file is small enough (= 1 MB) to be sent inline as base64. */
export type InlineRouting = {
	type: 'inline';
	data: string;
	mimeType: string;
};

/** The file was uploaded directly to Google Cloud Storage. */
export type GcsRouting = {
	type: 'gcs';
	fileUri: string;
	mimeType: string;
};

/** A web URL pasted by the user or specified in the config file. */
export type UrlRouting = {
	type: 'url';
	url: string;
};

/** Discriminated union of all possible file routing strategies. */
export type FileRouting = InlineRouting | GcsRouting | UrlRouting;

function toBase64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

export async function resolveFileRouting(
	file: File,
	rewordJSON: boolean
): Promise<Result<FileRouting | ResultEntry[]>> {
	if (file.type === FileTypes.JSON && !rewordJSON) {
		return tryResultAsync(
			file.text().then((text) => {
				const parsed = JSON.parse(text);
				const validated = fullResultSchema.safeParse(parsed);
				if (!validated.success) {
					throw new WizardError(EFileRoutingError.FORMAT_NOT_SUPPORTED);
				}
				return validated.data as ResultEntry[];
			}),
			WizardError,
			EFileRoutingError.FORMAT_NOT_SUPPORTED
		);
	}

	const { size, type: mimeType } = file;

	if (size > GCS_MAX_BYTES) {
		return errResult(WizardError, EFileRoutingError.FILE_TOO_LARGE);
	}

	if (size <= INLINE_MAX_BYTES) {
		return file
			.bytes()
			.then((buf) => toBase64(buf))
			.then((data) => {
				return okResult<FileRouting>({
					type: 'inline',
					data,
					mimeType
				});
			});
	}

	return uploadToGcs(file);
}

async function uploadToGcs(file: File): Promise<Result<FileRouting>> {
	const uploadUrlResult = await tryResultAsync(
		requestGcsUploadCommand({
			fileName: file.name,
			fullFilePath: file.webkitRelativePath || file.name,
			contentType: file.type,
			fileSize: file.size
		}),
		WizardError,
		EFileRoutingError.GCS_UPLOAD_URL_FAILED
	);
	if (!uploadUrlResult.ok) return uploadUrlResult;

	const { signedUrl, fileUri } = uploadUrlResult.data;

	if (!signedUrl) {
		return okResult<FileRouting>({
			type: 'gcs',
			fileUri,
			mimeType: file.type
		});
	}

	return tryResultAsync(
		fetch(signedUrl, {
			method: 'PUT',
			headers: {
				'Content-Type': file.type,
				'x-goog-if-generation-match': '0'
			},
			body: file
		}).then((res) => {
			if (res.status === 412) {
				return { type: 'gcs' as const, fileUri, mimeType: file.type };
			}
			if (!res.ok) throw gcsErrorFromStatus(res.status);
			return { type: 'gcs' as const, fileUri, mimeType: file.type };
		}),
		WizardError,
		EFileRoutingError.GCS_UPLOAD_FAILED
	);
}

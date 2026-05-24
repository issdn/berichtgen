import type { ResultEntry } from '$wizard/types';

import { errorByHttpCode } from '$lib/errors';
import { errResult, okResult, type Result, tryResultAsync } from '$lib/result';
import { requestGcsUploadCommand } from '$wizard/api/wizard.remote';
import { FileTypes } from '$wizard/enums';
import { EFileRoutingError, EGCSError, WizardError } from '$wizard/errors';
import { fullResultSchema } from '$wizard/schemas';

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

/** Discriminated union of all possible file routing strategies. */
export type FileRouting = GcsRouting | InlineRouting | UrlRouting;

/** The file was uploaded directly to Google Cloud Storage. */
export type GcsRouting = {
	fileUri: string;
	mimeType: string;
	type: 'gcs';
};

/** The file is small enough (= 1 MB) to be sent inline as base64. */
export type InlineRouting = {
	data: string;
	mimeType: string;
	type: 'inline';
};

/** A web URL pasted by the user or specified in the config file. */
export type UrlRouting = {
	type: 'url';
	url: string;
};

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
					data,
					mimeType,
					type: 'inline'
				});
			});
	}

	return uploadToGcs(file);
}

function toBase64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

async function uploadToGcs(file: File): Promise<Result<FileRouting>> {
	const uploadUrlResult = await tryResultAsync(
		requestGcsUploadCommand({
			contentType: file.type,
			fileName: file.name,
			fileSize: file.size,
			fullFilePath: file.webkitRelativePath || file.name
		}),
		WizardError,
		EFileRoutingError.GCS_UPLOAD_URL_FAILED
	);
	if (!uploadUrlResult.ok) return uploadUrlResult;

	const { fileUri, signedUrl } = uploadUrlResult.data;

	if (!signedUrl) {
		return okResult<FileRouting>({
			fileUri,
			mimeType: file.type,
			type: 'gcs'
		});
	}

	return tryResultAsync(
		fetch(signedUrl, {
			body: file,
			headers: {
				'Content-Type': file.type,
				'x-goog-if-generation-match': '0'
			},
			method: 'PUT'
		}).then((res) => {
			if (res.status === 412) {
				return { fileUri, mimeType: file.type, type: 'gcs' as const };
			}
			if (!res.ok) throw gcsErrorFromStatus(res.status);
			return { fileUri, mimeType: file.type, type: 'gcs' as const };
		}),
		WizardError,
		EFileRoutingError.GCS_UPLOAD_FAILED
	);
}

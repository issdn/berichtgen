import { okResult, tryResultAsync } from '$lib/result';
import { requestGcsUploadCommand } from '$wizard/api/wizard.remote';
import { EFileRoutingError, WizardError } from '$wizard/errors';

export async function uploadToGcs(file: File) {
	const result = await tryResultAsync(
		requestGcsUploadCommand({
			contentType: file.type,
			fileName: file.name,
			fileSize: file.size,
			fullFilePath: file.webkitRelativePath || file.name
		}),
		WizardError,
		EFileRoutingError.GCS_UPLOAD_URL_FAILED
	);

	if (!result.ok) return result;

	if (result.data.signedUrl === null) return okResult(result.data);

	return tryResultAsync(
		fetch(result.data.signedUrl, {
			body: file,
			headers: {
				'Content-Type': file.type,
				'x-goog-if-generation-match': '0'
			},
			method: 'PUT'
		}).then((res) => {
			if (!res.ok) throw new WizardError(EFileRoutingError.GCS_UPLOAD_FAILED);
			return { fileUri: result.data.fileUri, signedUrl: result.data.signedUrl };
		}),
		WizardError,
		EFileRoutingError.GCS_UPLOAD_FAILED
	);
}

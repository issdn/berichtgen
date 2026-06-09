import { BerichtgenError } from '$lib/errors';
import { okResult, tryResultAsync } from '$lib/result';
import { requestGcsUploadCommand } from '$wizard/api/wizard.remote';
import { EFileRoutingError } from '$wizard/errors';

async function upload({ file, signedUrl }: { file: File; signedUrl: string }) {
	const res = await fetch(signedUrl, {
		body: file,
		method: 'PUT'
	});

	if (!res.ok) {
		throw new BerichtgenError(EFileRoutingError.GCS_UPLOAD_FAILED);
	}
}

export async function uploadToGcs(file: File) {
	const result = await tryResultAsync({
		apiError: EFileRoutingError.GCS_UPLOAD_URL_FAILED,
		promise: requestGcsUploadCommand({
			fileName: file.name,
			fileSize: file.size,
			fullFilePath: file.webkitRelativePath || file.name
		})
	});

	if (!result.ok) return result;

	if (result.data.signedUrl === null) return okResult(result.data);

	const uploadedResult = await tryResultAsync({
		apiError: EFileRoutingError.GCS_UPLOAD_FAILED,
		promise: upload({ file, signedUrl: result.data.signedUrl })
	});

	if (!uploadedResult.ok) return uploadedResult;

	return okResult({
		fileUri: result.data.fileUri,
		signedUrl: result.data.signedUrl
	});
}

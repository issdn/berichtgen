import type { ResultEntry } from '$wizard/types';

import { downloadBlob } from '$lib/utils';
import { FileTypes } from '$wizard/enums';

export async function handleJSONDownload(
	entries: Promise<ResultEntry[]>,
	download: string = 'bericht.json'
) {
	const blob = new Blob([JSON.stringify(await entries)], {
		type: FileTypes.JSON
	});
	downloadBlob(blob, download);
}

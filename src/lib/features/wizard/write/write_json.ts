import type { TimeSpreadResult } from '$wizard/types';

import { downloadBlob } from '$lib/utils';
import { FileTypes } from '$wizard/enums';

export function handleJSONDownload(
	entries: TimeSpreadResult,
	download: string = 'bericht.json'
) {
	const blob = new Blob([JSON.stringify(entries)], {
		type: FileTypes.JSON
	});
	downloadBlob(blob, download);
}

import { downloadBlob } from '$lib/utils';
import type { ResultEntry } from '$wizard/types';

export async function handleJSONDownload(
	entries: Promise<ResultEntry[]>,
	download: string = 'bericht.json'
) {
	const blob = new Blob([JSON.stringify(await entries)], {
		type: 'application/json'
	});
	downloadBlob(blob, download);
}

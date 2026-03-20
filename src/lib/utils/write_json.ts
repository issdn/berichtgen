import type { ResultEntry } from '$src/lib/types';
import { downloadBlob } from './dom';

export async function handleJSONDownload(
	entries: Promise<ResultEntry[]>,
	download: string = 'bericht.json'
) {
	const blob = new Blob([JSON.stringify(await entries)], {
		type: 'application/json'
	});
	downloadBlob(blob, download);
}

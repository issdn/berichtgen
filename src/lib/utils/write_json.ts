import type { ResultEntry } from '$src/lib/types';

export async function handleJSONDownload(
	entries: Promise<ResultEntry[]>,
	download: string = 'bericht.json'
) {
	const blob = new Blob([JSON.stringify(await entries)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');

	a.href = url;
	a.download = download;
	document.body.appendChild(a);
	a.click();

	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

import { LOCALE, TIMEZONE } from '$lib/constants';
import { now, startOfWeek, toCalendarDate } from '@internationalized/date';

export function buildConfigMap(
	files: (File | FileSystemFileEntry)[]
): Map<string, string> {
	const mondayOfWeek = toCalendarDate(
		startOfWeek(now(TIMEZONE), LOCALE, 'mon')
	);
	const endOfWeek = mondayOfWeek.copy().add({ days: 7 });

	const texts = new Map<string, string>();
	for (const file of files) {
		const filePath =
			file instanceof File
				? file.webkitRelativePath
				: (file as FileSystemFileEntry).fullPath;
		const parts = filePath.split('/').filter(Boolean);
		const root = parts[0] ?? '';
		const fileName = parts.at(-1) ?? '';
		texts.set(
			root,
			(texts.get(root) ?? '') +
				`SCHULE,"${fileName}",${mondayOfWeek};${endOfWeek};40\n`
		);
	}
	return texts;
}

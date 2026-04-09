import { test, expect } from 'vitest';
import { get2DimensionalDirectories } from '$core/scan/file_scan';
import { ScanReturnValue } from '$core/types';

function makeFileEntry(fullPath: string): FileSystemFileEntry {
	return {
		isFile: true,
		isDirectory: false,
		fullPath,
		name: fullPath.split('/').at(-1)!
	} as unknown as FileSystemFileEntry;
}

function makeDirEntry(children: FileSystemEntry[]): FileSystemDirectoryEntry {
	let read = false;
	return {
		isFile: false,
		isDirectory: true,
		createReader: () => ({
			readEntries: (success: (entries: FileSystemEntry[]) => void) => {
				// FileSystem API requires calling readEntries repeatedly until [] is returned
				if (!read) {
					read = true;
					success(children);
				} else {
					success([]);
				}
			}
		})
	} as unknown as FileSystemDirectoryEntry;
}

function makeItemList(entries: FileSystemEntry[]): DataTransferItemList {
	const items = entries.map((entry) => ({ webkitGetAsEntry: () => entry }));
	return {
		[Symbol.iterator]: () => items[Symbol.iterator]()
	} as unknown as DataTransferItemList;
}

test('returns all files including those alongside subdirectories (regression)', async () => {
	// Structure: notes/ containing raid.pdf at root level AND hist/ subdirectory
	// Previously, raid.pdf was silently dropped because the depth-based flattening
	// left it as a bare entry that got filtered by `directory.length > 0`.
	const raid = makeFileEntry('/notes/raid-full-page-with-img.pdf');
	const f1 = makeFileEntry('/notes/hist/Balkanfeldzug_(1941).pdf');
	const f2 = makeFileEntry('/notes/hist/Jugoslawischer_Kriegsschauplatz.pdf');
	const f3 = makeFileEntry('/notes/hist/Timeline.pdf');

	const histDir = makeDirEntry([f1, f2, f3]);
	const notesDir = makeDirEntry([histDir, raid]);

	const result = await get2DimensionalDirectories(
		makeItemList([notesDir]),
		ScanReturnValue.DATA_TRANSFER_ITEM
	);

	const allFiles = result.flat() as FileSystemFileEntry[];
	const paths = allFiles.map((f) => f.fullPath);

	expect(allFiles).toHaveLength(4);
	expect(paths).toContain('/notes/raid-full-page-with-img.pdf');
	expect(paths).toContain('/notes/hist/Balkanfeldzug_(1941).pdf');
	expect(paths).toContain('/notes/hist/Jugoslawischer_Kriegsschauplatz.pdf');
	expect(paths).toContain('/notes/hist/Timeline.pdf');
});

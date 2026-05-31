import { EParserError } from '$core/parser/errors';
import { get2DimensionalDirectories } from '$core/scan/file_scan';
import {
	extractFilesSimple,
	getFileListWithPreserverFolderStructure
} from '$core/scan/file_scan';
import { type ScanReturnType, ScanReturnValue } from '$core/types';
import { describe, expect, test } from 'vitest';

class MockFileList extends Array<File> {}
(globalThis as unknown as { FileList?: typeof MockFileList }).FileList =
	MockFileList;

function makeDirEntry(children: FileSystemEntry[]): FileSystemDirectoryEntry {
	let read = false;
	return {
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
		}),
		isDirectory: true,
		isFile: false
	} as unknown as FileSystemDirectoryEntry;
}

function makeFileEntry(fullPath: string): FileSystemFileEntry {
	return {
		fullPath,
		isDirectory: false,
		isFile: true,
		name: fullPath.split('/').at(-1)!
	} as unknown as FileSystemFileEntry;
}

function makeItemList(entries: FileSystemEntry[]): DataTransferItemList {
	const items = entries.map((entry) => ({ webkitGetAsEntry: () => entry }));
	return {
		[Symbol.iterator]: () => items[Symbol.iterator]()
	} as unknown as DataTransferItemList;
}

function makeItemListWithKinds(
	items: Array<{ file: File | null; kind: string }>
): DataTransferItemList {
	const dataTransferItems = items.map((item) => ({
		getAsFile: () => item.file,
		kind: item.kind
	}));

	return {
		[Symbol.iterator]: () => dataTransferItems[Symbol.iterator]()
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

describe('get2DimensionalDirectories', () => {
	test('returns file entries when return type is FILE', async () => {
		const fileA = new File(['a'], 'a.txt', { type: 'text/plain' });
		const fileB = new File(['b'], 'b.txt', { type: 'text/plain' });

		const entryA = {
			file: (success: (file: File) => void) => success(fileA),
			isDirectory: false,
			isFile: true
		} as unknown as FileSystemFileEntry;

		const entryB = {
			file: (success: (file: File) => void) => success(fileB),
			isDirectory: false,
			isFile: true
		} as unknown as FileSystemFileEntry;

		const result = await get2DimensionalDirectories(
			makeItemList([entryA, entryB]),
			ScanReturnValue.FILE
		);

		expect(result).toEqual([[fileA], [fileB]]);
	});

	test('throws INVALID_FILE for unknown return type', async () => {
		await expect(
			get2DimensionalDirectories(
				makeItemList([]),
				'bad-type' as unknown as ScanReturnType
			)
		).rejects.toMatchObject({
			apiError: EParserError.INVALID_FILE
		});
	});

	test('throws INVALID_FILE when webkitGetAsEntry returns null', async () => {
		const items = [
			{
				webkitGetAsEntry: () => null
			}
		];

		await expect(
			get2DimensionalDirectories(
				{
					[Symbol.iterator]: () => items[Symbol.iterator]()
				} as unknown as DataTransferItemList,
				ScanReturnValue.DATA_TRANSFER_ITEM
			)
		).rejects.toMatchObject({
			apiError: EParserError.INVALID_FILE
		});
	});
});

describe('getFileListWithPreserverFolderStructure', () => {
	test('groups files by parent directory while preserving insertion order', () => {
		const files = [
			Object.assign(new File(['a'], 'a.txt'), {
				webkitRelativePath: 'alpha/a.txt'
			}),
			Object.assign(new File(['b'], 'b.txt'), {
				webkitRelativePath: 'alpha/b.txt'
			}),
			Object.assign(new File(['c'], 'c.txt'), {
				webkitRelativePath: 'beta/c.txt'
			})
		] as unknown as FileList;

		const result = getFileListWithPreserverFolderStructure(files);
		expect(result).toHaveLength(2);
		expect(result[0].map((f) => f.name)).toEqual(['a.txt', 'b.txt']);
		expect(result[1].map((f) => f.name)).toEqual(['c.txt']);
	});
});

describe('extractFilesSimple', () => {
	test('extracts only valid files from DataTransferItemList', () => {
		const file = new File(['x'], 'x.txt', { type: 'text/plain' });
		const result = extractFilesSimple(
			makeItemListWithKinds([
				{ file, kind: 'file' },
				{ file: null, kind: 'file' },
				{ file: null, kind: 'string' }
			])
		);

		expect(result).toEqual([file]);
	});

	test('returns all files when input is FileList', () => {
		const fileA = new File(['a'], 'a.txt');
		const fileB = new File(['b'], 'b.txt');
		const fileList = new MockFileList(fileA, fileB) as unknown as FileList;

		expect(extractFilesSimple(fileList)).toEqual([fileA, fileB]);
	});
});

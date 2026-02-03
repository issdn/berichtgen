import { ***REMOVED***ErrorType, ScanReturnType } from '$src/lib/enums';
import { ***REMOVED***Error } from '$src/lib/errors';
import type { WizardRawDirectories, WizardRawDirectory } from '$src/lib/types';
import { promisify } from '$src/lib/utils';
import { getArrayDepth } from '$src/lib/utils/math';

export function getFileListWithPreserverFolderStructure(files: FileList): WizardRawDirectories {
	const directories = new Map<string, WizardRawDirectory>(
		[...files].reduce((acc, file) => {
			const pathParts = file.webkitRelativePath.split('/');
			const directoryPath = pathParts.slice(0, -1).join('/');
			if (!acc.has(directoryPath)) {
				acc.set(directoryPath, []);
			}
			acc.get(directoryPath)?.push(file);
			return acc;
		}, new Map<string, WizardRawDirectory>())
	);
	return [...directories.values()];
}

export async function get2DimensionalDirectories(
	items: DataTransferItemList,
	returnType: ScanReturnType
) {
	if (returnType === ScanReturnType.FILE) {
		return _get2DimensionalDirectories(items, scanFiles);
	} else if (returnType === ScanReturnType.DATA_TRANSFER_ITEM) {
		return _get2DimensionalDirectories(items, scanSystemFileEntries);
	} else {
		throw new ***REMOVED***Error(
			***REMOVED***ErrorType.INVALID_FILE,
			'Unbekannter Scan-Typ: ' + returnType
		);
	}
}

async function _get2DimensionalDirectories<T>(
	items: DataTransferItemList,
	scanFunction: (item: FileSystemEntry, items?: T[][]) => Promise<T[][]>
) {
	const resolvedDirectoriesPromises: Promise<T>[] = [];
	const topLevelFilesPromises: Promise<T>[] = [];
	[...items].forEach((item) => {
		const entry = item.webkitGetAsEntry();
		if (entry === null)
			throw new ***REMOVED***Error(***REMOVED***ErrorType.INVALID_FILE, 'Fehler beim Lesen einer Datei');
		if (entry.isFile) {
			topLevelFilesPromises.push(scanFunction(entry) as Promise<T>);
		} else {
			resolvedDirectoriesPromises.push(scanFunction(entry) as Promise<T>);
		}
	});
	const resolvedDirectories = await Promise.all(resolvedDirectoriesPromises);
	const depth = getArrayDepth(resolvedDirectories);
	const flattenedDirectories = resolvedDirectories.flat(depth > 2 ? depth - 2 : 0) as T[][];
	const directoriesWithoutAnyEmpty = flattenedDirectories.filter(
		(directory) => directory.length > 0
	);
	if (topLevelFilesPromises.length > 0) {
		directoriesWithoutAnyEmpty.push((await Promise.all(topLevelFilesPromises)).flat() as T[]);
	}
	return directoriesWithoutAnyEmpty;
}

async function scanFiles(item: FileSystemEntry, items: WizardRawDirectories = []) {
	if (item.isDirectory) {
		const directoryReader = (item as FileSystemDirectoryEntry).createReader();
		const allEntries: WizardRawDirectories = [];
		let entriesResult: WizardRawDirectories = [];

		do {
			const readEntriesPromise = new Promise<WizardRawDirectories>((resolve, reject) => {
				directoryReader.readEntries(async (entries) => {
					resolve((await Promise.all(entries.map((entry) => scanFiles(entry, items)))).flat());
				}, reject);
			});
			entriesResult = await readEntriesPromise;
			if (entriesResult.length > 0) {
				allEntries.push(entriesResult as unknown as File[]);
			}
		} while (entriesResult.length > 0);

		return allEntries;
	} else if (item.isFile) {
		return [
			...items,
			await promisify((item as FileSystemFileEntry).file.bind(item))
		] as WizardRawDirectories;
	}
	return items;
}

async function scanSystemFileEntries(item: FileSystemEntry, items: FileSystemFileEntry[][] = []) {
	if (item.isDirectory) {
		const directoryReader = (item as FileSystemDirectoryEntry).createReader();
		const allEntries: FileSystemFileEntry[][] = [];
		let entriesResult: FileSystemFileEntry[][] = [];

		do {
			const readEntriesPromise = new Promise<FileSystemFileEntry[][]>((resolve, reject) => {
				directoryReader.readEntries(async (entries) => {
					resolve(
						(await Promise.all(entries.map((entry) => scanSystemFileEntries(entry, items)))).flat()
					);
				}, reject);
			});
			entriesResult = await readEntriesPromise;
			if (entriesResult.length > 0) {
				allEntries.push(entriesResult as unknown as FileSystemFileEntry[]);
			}
		} while (entriesResult.length > 0);

		return allEntries;
	} else if (item.isFile) {
		return [...items, item] as FileSystemFileEntry[][];
	}
	return items;
}

export function extractFilesSimple(input: DataTransferItemList | FileList): File[] {
	if (input instanceof FileList) {
		return Array.from(input);
	}

	return Array.from(input)
		.map((item) => (item.kind === 'file' ? item.getAsFile() : null))
		.filter((file): file is File => !!file);
}

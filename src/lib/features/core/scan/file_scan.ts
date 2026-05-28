import type { WizardRawDirectories, WizardRawDirectory } from '$wizard/types';

import { EParserError } from '$core/parser/errors';
import { type ScanReturnType, ScanReturnValue } from '$core/types';
import { BerichtgenError } from '$lib/errors';

/**
 * Validates a file and must throw (typically `BerichtgenError`) when invalid.
 * Returning normally means the file is valid.
 */
export type FileValidator = (file: File) => void;

export function extractFilesSimple(
	input: DataTransferItemList | FileList
): File[] {
	if (input instanceof FileList) {
		return Array.from(input);
	}

	return Array.from(input)
		.map((item) => (item.kind === 'file' ? item.getAsFile() : null))
		.filter((file): file is File => !!file);
}

export async function get2DimensionalDirectories(
	items: DataTransferItemList,
	returnType: ScanReturnType,
	isFileValid?: FileValidator
) {
	if (returnType === ScanReturnValue.FILE) {
		return _get2DimensionalDirectories(items, (entry) =>
			scanFiles(entry, [], isFileValid)
		);
	} else if (returnType === ScanReturnValue.DATA_TRANSFER_ITEM) {
		return _get2DimensionalDirectories(items, scanSystemFileEntries);
	} else {
		throw new BerichtgenError(EParserError.INVALID_FILE);
	}
}

export function getFileListWithPreserverFolderStructure(
	files: FileList,
	isFileValid?: FileValidator
): WizardRawDirectories {
	const directories = new Map<string, WizardRawDirectory>(
		[...files].reduce((acc, file) => {
			validateFile({ file, isFileValid });
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

export async function scanDroppedInput(
	input: DataTransferItemList | FileList,
	returnType: (typeof ScanReturnValue)['FILE'],
	isFileValid?: FileValidator
): Promise<WizardRawDirectories>;
export async function scanDroppedInput(
	input: DataTransferItemList | FileList,
	returnType: (typeof ScanReturnValue)['DATA_TRANSFER_ITEM']
): Promise<(File | FileSystemFileEntry)[][]>;
export async function scanDroppedInput(
	input: DataTransferItemList | FileList,
	returnType: ScanReturnType,
	isFileValid?: FileValidator
): Promise<(File | FileSystemFileEntry)[][] | WizardRawDirectories> {
	if (input instanceof FileList) {
		if (returnType === ScanReturnValue.FILE) {
			return getFileListWithPreserverFolderStructure(input, isFileValid);
		}
		return getFileListWithPreserverFolderStructure(input, isFileValid);
	}
	return get2DimensionalDirectories(input, returnType, isFileValid);
}
async function _get2DimensionalDirectories<T>(
	items: DataTransferItemList,
	scanFunction: (item: FileSystemEntry, items?: T[][]) => Promise<T[][]>
): Promise<T[][]> {
	const entries = [...items].map((item) => {
		const entry = item.webkitGetAsEntry();
		if (entry === null) throw new BerichtgenError(EParserError.INVALID_FILE);
		return entry;
	});

	const scannedGroups = await Promise.all(
		entries.map((entry) => scanFunction(entry))
	);

	// scanFunction returns T[][] but nesting depth varies with directory structure —
	// a folder containing both files and subdirectories produces uneven depth.
	// Flatten each group fully so no files are lost regardless of nesting depth,
	// then drop any empty groups (e.g. empty directories).
	return scannedGroups
		.map((group) => group.flat(Infinity) as T[])
		.filter((group) => group.length > 0);
}

async function scanFiles(
	item: FileSystemEntry,
	items: WizardRawDirectories = [],
	isFileValid?: FileValidator
) {
	if (item.isDirectory) {
		const directoryReader = (item as FileSystemDirectoryEntry).createReader();
		const allEntries: WizardRawDirectories = [];
		let entriesResult: WizardRawDirectories = [];

		do {
			const readEntriesPromise = new Promise<WizardRawDirectories>(
				(resolve, reject) => {
					directoryReader.readEntries(async (entries) => {
						resolve(
							(
								await Promise.all(
									entries.map((entry) => scanFiles(entry, items, isFileValid))
								)
							).flat()
						);
					}, reject);
				}
			);
			entriesResult = await readEntriesPromise;
			if (entriesResult.length > 0) {
				allEntries.push(entriesResult as unknown as File[]);
			}
		} while (entriesResult.length > 0);

		return allEntries;
	} else if (item.isFile) {
		const file = await new Promise<File>((resolve, reject) =>
			(item as FileSystemFileEntry).file(resolve, reject)
		);
		validateFile({ file, isFileValid });
		return [[file]] as WizardRawDirectories;
	}
	return items;
}

async function scanSystemFileEntries(
	item: FileSystemEntry,
	items: FileSystemFileEntry[][] = []
) {
	if (item.isDirectory) {
		const directoryReader = (item as FileSystemDirectoryEntry).createReader();
		const allEntries: FileSystemFileEntry[][] = [];
		let entriesResult: FileSystemFileEntry[][] = [];

		do {
			const readEntriesPromise = new Promise<FileSystemFileEntry[][]>(
				(resolve, reject) => {
					directoryReader.readEntries(async (entries) => {
						resolve(
							(
								await Promise.all(
									entries.map((entry) => scanSystemFileEntries(entry, items))
								)
							).flat()
						);
					}, reject);
				}
			);
			entriesResult = await readEntriesPromise;
			if (entriesResult.length > 0) {
				allEntries.push(entriesResult as unknown as FileSystemFileEntry[]);
			}
		} while (entriesResult.length > 0);

		return allEntries;
	} else if (item.isFile) {
		return [[item as FileSystemFileEntry]];
	}
	return items;
}

function validateFile({
	file,
	isFileValid
}: {
	file: File;
	isFileValid?: FileValidator;
}): void {
	if (!isFileValid) return;
	isFileValid(file);
}

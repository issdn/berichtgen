import type {
	CSVConfigFile,
	WizardDirectory,
	WizardRawDirectory
} from '$wizard/types';

import { GCS_MAX_BYTES, INLINE_MAX_BYTES } from '$lib/constants';
import { BerichtgenError, ECommonServerError } from '$lib/errors';
import { FileTypes } from '$wizard/enums';
import { WizardFile } from '$wizard/services/wizard_file';

/**
 * Validates a dropped wizard file against auth, file type, and size rules.
 */
export function validateWizardDropFile({
	accept,
	file,
	loggedIn
}: {
	accept: string;
	file: File;
	loggedIn: boolean;
}): void {
	if (file.type === FileTypes.URI_LIST) return;

	if (!loggedIn && file.type !== FileTypes.JSON) {
		throw new BerichtgenError({
			...ECommonServerError.UNAUTHORIZED,
			cause:
				'Du musst angemeldet sein, um Dateien zu verarbeiten. Ohne Login ist nur das Datieren von JSON-Dateien erlaubt.'
		});
	}

	if (file.type === FileTypes.TXT && file.size > INLINE_MAX_BYTES) {
		throw new BerichtgenError({
			...ECommonServerError.VALIDATION_ERROR,
			cause: `"${file.name}" ist zu groß für direkten Text-Upload (max. 400 KB für TXT).`
		});
	}

	if (file.type.length === 0 || !accept.includes(file.type)) {
		throw new BerichtgenError({
			...ECommonServerError.VALIDATION_ERROR,
			cause: `"${file.name}" hat einen nicht erlaubten Dateityp (${file.type || 'leer'}).`
		});
	}

	if (file.size > GCS_MAX_BYTES) {
		throw new BerichtgenError({
			...ECommonServerError.VALIDATION_ERROR,
			cause: `"${file.name}" überschreitet die maximale Dateigröße von 50MB.`
		});
	}
}

/**
 * Returns whether any dropped file is not a JSON file.
 */
export function hasAnyNonJsonFiles({
	directories
}: {
	directories: WizardRawDirectory[];
}): boolean {
	return directories.flat().some((file) => file.type !== FileTypes.JSON);
}

/**
 * Returns the config file and data files for one dropped directory.
 */
export function splitDirectoryFiles({
	configFilePattern,
	files
}: {
	configFilePattern: RegExp;
	files: WizardRawDirectory;
}): {
	configFile: File | null;
	dataFiles: File[];
} {
	const configFile =
		files.find((file) => configFilePattern.test(file.name)) ?? null;
	return {
		configFile,
		dataFiles: files.filter((file) => !configFilePattern.test(file.name))
	};
}

/**
 * Applies CSV config rows to wizard directory entries and returns any warnings.
 */
export function applyConfigToEntries({
	configRows,
	entries
}: {
	configRows: CSVConfigFile[];
	entries: WizardDirectory;
}): {
	entries: WizardDirectory;
	missingConfiguredFiles: boolean;
	notFound: string[];
} {
	const fileEntries = new Map(entries.map((entry) => [entry.name, entry]));
	const notFound: string[] = [];

	for (const { file, ort, ranges } of configRows) {
		const config = {
			ort,
			ranges: ranges.map((range, index) => ({ ...range, id: index }))
		};

		if (URL.canParse(file)) {
			entries.push(WizardFile.fromUrl({ config, url: file }));
			continue;
		}

		const existingFile = fileEntries.get(file);
		if (existingFile) {
			WizardFile.fromFile({ config, file: existingFile });
			continue;
		}

		notFound.push(file);
	}

	const configuredFileCount = configRows.filter(
		({ file }) => !URL.canParse(file)
	).length;

	return {
		entries,
		missingConfiguredFiles: configuredFileCount < fileEntries.size,
		notFound
	};
}

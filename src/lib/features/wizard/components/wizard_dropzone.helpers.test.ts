import { CONFIG_FILENAME_REGEX, INLINE_MAX_BYTES } from '$lib/constants';
import { BerichtgenError } from '$lib/errors';
import {
	applyConfigToEntries,
	hasAnyNonJsonFiles,
	splitDirectoryFiles,
	validateWizardDropFile
} from '$wizard/components/wizard_dropzone.helpers';
import { FileTypes } from '$wizard/enums';
import { WizardFile } from '$wizard/services/wizard_file';
import { CalendarDate } from '@internationalized/date';
import { describe, expect, test } from 'vitest';

describe('validateWizardDropFile', () => {
	test('allows json files for logged out users', () => {
		expect(() =>
			validateWizardDropFile({
				accept: Object.values(FileTypes).join(','),
				file: new File(['{}'], 'data.json', { type: FileTypes.JSON }),
				loggedIn: false
			})
		).not.toThrow();
	});

	test('rejects non-json files for logged out users', () => {
		expect(() =>
			validateWizardDropFile({
				accept: Object.values(FileTypes).join(','),
				file: new File(['x'], 'data.txt', { type: FileTypes.TXT }),
				loggedIn: false
			})
		).toThrow(BerichtgenError);
	});

	test('rejects txt files over 400 KB', () => {
		expect(() =>
			validateWizardDropFile({
				accept: Object.values(FileTypes).join(','),
				file: new File(['x'.repeat(INLINE_MAX_BYTES + 1)], 'big.txt', {
					type: FileTypes.TXT
				}),
				loggedIn: true
			})
		).toThrow(BerichtgenError);
	});
});

describe('hasAnyNonJsonFiles', () => {
	test('returns true when any file is not json', () => {
		expect(
			hasAnyNonJsonFiles({
				directories: [
					[
						new File(['{}'], 'a.json', { type: FileTypes.JSON }),
						new File(['x'], 'b.txt', { type: FileTypes.TXT })
					]
				]
			})
		).toBe(true);
	});

	test('returns false when all files are json', () => {
		expect(
			hasAnyNonJsonFiles({
				directories: [[new File(['{}'], 'a.json', { type: FileTypes.JSON })]]
			})
		).toBe(false);
	});
});

describe('splitDirectoryFiles', () => {
	test('separates config file from data files', () => {
		const config = new File(['cfg'], 'berichtgen.csv', { type: 'text/csv' });
		const doc = new File(['x'], 'note.txt', { type: FileTypes.TXT });

		const result = splitDirectoryFiles({
			configFilePattern: CONFIG_FILENAME_REGEX,
			files: [config, doc]
		});

		expect(result.configFile?.name).toBe('berichtgen.csv');
		expect(result.dataFiles.map((file) => file.name)).toEqual(['note.txt']);
	});
});

describe('applyConfigToEntries', () => {
	test('applies config to existing files and appends url entries', () => {
		const entry = WizardFile.fromFile({
			file: new File(['x'], 'note.txt', { type: FileTypes.TXT })
		});

		const result = applyConfigToEntries({
			configRows: [
				{
					file: 'note.txt',
					ort: 'BETRIEB',
					ranges: [
						{
							daterange: {
								end: new CalendarDate(2024, 1, 2),
								start: new CalendarDate(2024, 1, 1)
							}
						}
					]
				},
				{
					file: 'https://example.com',
					ort: 'BETRIEB',
					ranges: [
						{
							daterange: {
								end: new CalendarDate(2024, 1, 2),
								start: new CalendarDate(2024, 1, 1)
							}
						}
					]
				}
			],
			entries: [entry]
		});

		expect(result.entries).toHaveLength(2);
		expect((result.entries[0] as WizardFile).config?.ranges).toHaveLength(1);
		expect((result.entries[1] as WizardFile).isUrl).toBe(true);
		expect(result.notFound).toEqual([]);
		expect(result.missingConfiguredFiles).toBe(false);
	});

	test('reports not found config files', () => {
		const result = applyConfigToEntries({
			configRows: [
				{
					file: 'missing.txt',
					ort: 'BETRIEB',
					ranges: [
						{
							daterange: {
								end: new CalendarDate(2024, 1, 2),
								start: new CalendarDate(2024, 1, 1)
							}
						}
					]
				}
			],
			entries: []
		});

		expect(result.notFound).toEqual(['missing.txt']);
	});
});

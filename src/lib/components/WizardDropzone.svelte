<script lang="ts">
	import Dropzone from '$src/lib/components/Dropzone.svelte';
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';
	import { countUserTokensDirectories } from '$src/lib/utils/token_counter';
	import {
		type UserContext,
		type WizardDirectory,
		type WizardRawDirectories,
		type WizardRawDirectory
	} from '$src/lib/types';
	import { toast } from 'svelte-sonner';
	import { getContext } from 'svelte';
	import { CONFIG_FILENAME_REGEX } from '$src/lib/constants';
	import { readCsvConfig } from '$src/lib/parse/config_reader';
	import { FileTypes, ScanReturnType } from '$src/lib/enums';
	import {
		get2DimensionalDirectories,
		getFileListWithPreserverFolderStructure
	} from '$src/lib/parse/file_scan';

	let { loggedIn } = getContext<UserContext>('user')();

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let _error: string | null = $state(null);

	let filesNumber = $state(0);

	async function handleFiles(items: DataTransferItemList | FileList) {
		_error = null;
		try {
			const directories =
				items instanceof FileList
					? getFileListWithPreserverFolderStructure(items)
					: ((await get2DimensionalDirectories(
							items,
							ScanReturnType.FILE
						)) as WizardRawDirectories);
			filesNumber = directories.flat().length;
			const anyNonJsonFiles = directories
				.flat()
				.find((f) => f.type !== FileTypes.JSON);
			if (loggedIn) {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const _totalTokens = countUserTokensDirectories(directories);
				// Note: userTokens check would need to be passed from parent or context
				// For now, we proceed with the processing
				init(directories);
			} else {
				if (anyNonJsonFiles) {
					_error =
						'Du musst angemeldet sein um andere Dateien parsen und umformulieren zu können! Bitte lade nur JSON-Dateien hoch.';
					wizardScheduler.schedule = null;
				} else {
					init(directories);
				}
			}
		} catch (error) {
			toast.error('Fehler beim Scannen der Dateien: ' + error);
		}
	}

	function init(directories: WizardRawDirectories) {
		wizardScheduler.processInit = (async () => {
			await wizardScheduler.init();
			const resolvedDirectories = await Promise.all(
				directories.map(resolveDirectory)
			);
			wizardScheduler.createSchedule(resolvedDirectories);
			wizardScheduler.schedule?.forEach(wizardScheduler.enqueue);
		})();
	}

	async function resolveDirectory(
		files: WizardRawDirectory
	): Promise<WizardDirectory> {
		const configFile =
			files.find((file) => CONFIG_FILENAME_REGEX.test(file.name)) || null;
		const otherFiles = files.reduce((directory, file) => {
			if (!CONFIG_FILENAME_REGEX.test(file.name)) {
				return [{ file }, ...directory];
			} else {
				return directory;
			}
		}, [] as WizardDirectory);
		if (configFile == null) {
			return otherFiles;
		}
		const config = await readCsvConfig(configFile);
		return config.match(
			(config) => {
				const notFoundFiles: string[] = [];
				const nameToFileMap = new Map(otherFiles.map((f) => [f.file.name, f]));
				config.forEach(({ file, ort, ranges }) => {
					const wizardFile = nameToFileMap.get(file);
					if (wizardFile) {
						wizardFile.config = {
							ranges: ranges.map((obj, i) => ({ ...obj, id: i })),
							ort
						};
					} else {
						notFoundFiles.push(file);
					}
				});
				if (config.length < otherFiles.length) {
					toast('Nicht alle Dateien in der Konfiguration gefunden.');
				}
				if (notFoundFiles.length > 0) {
					toast.error(
						`Die folgenden Dateien aus der Konfig wurden nicht hochgeladen: ${notFoundFiles.join(', ')}`
					);
				}
				console.log(otherFiles);
				return otherFiles;
			},
			(err) => {
				toast.error(
					`Fehler beim Lesen der Konfiguration: ${err.message || 'Unbekannter Fehler'}`
				);
				return otherFiles;
			}
		);
	}
</script>

<Dropzone {handleFiles} {filesNumber} />

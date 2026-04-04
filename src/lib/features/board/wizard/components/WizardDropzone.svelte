<script lang="ts">
	import type { UserContext } from '$auth/types';
	import type {
		WizardDirectory,
		WizardRawDirectories,
		WizardRawDirectory
	} from '$wizard/types';
	import Dropzone from '$board/components/Dropzone.svelte';
	import { readCsvConfig } from '$core/parser/config_reader';
	import { ScanReturnValue } from '$core/types';
	import { CONFIG_FILENAME_REGEX } from '$lib/constants';
	import {
		get2DimensionalDirectories,
		getFileListWithPreserverFolderStructure
	} from '$core/scan/file_scan';
	import { FileTypes } from '$wizard/enums';
	import { wizardScheduler } from '$wizard/services/wizard_scheduler.svelte';
	import { getContext } from 'svelte';
	import { toast } from 'svelte-sonner';

	let { loggedIn } = getContext<UserContext>('user')();

	let filesNumber = $state(0);

	let accept = $derived(loggedIn ? undefined : '.json');

	async function handleFiles(items: DataTransferItemList | FileList) {
		try {
			const directories =
				items instanceof FileList
					? getFileListWithPreserverFolderStructure(items)
					: ((await get2DimensionalDirectories(
							items,
							ScanReturnValue.FILE
						)) as WizardRawDirectories);
			filesNumber = directories.flat().length;
			const anyNonJsonFiles = directories
				.flat()
				.find((f) => f.type !== FileTypes.JSON);
			if (loggedIn) {
				// Note: userTokens check would need to be passed from parent or context
				// For now, we proceed with the processing
				init(directories);
			} else {
				if (anyNonJsonFiles) {
					toast.error(
						'Du musst angemeldet sein um andere Dateien parsen und umformulieren zu können! Bitte lade nur JSON-Dateien hoch.'
					);
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
		if (!config.ok) {
			toast.error(
				`Fehler beim Lesen der Konfiguration: ${config.error.message || 'Unbekannter Fehler'}`
			);
			return otherFiles;
		}
		const notFoundFiles: string[] = [];
		const nameToFileMap = new Map(otherFiles.map((f) => [f.file.name, f]));
		config.data.forEach(({ file, ort, ranges }) => {
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
		if (config.data.length < otherFiles.length) {
			toast('Nicht alle Dateien in der Konfiguration gefunden.');
		}
		if (notFoundFiles.length > 0) {
			toast.error(
				`Die folgenden Dateien aus der Konfig wurden nicht hochgeladen: ${notFoundFiles.join(', ')}`
			);
		}
		return otherFiles;
	}
</script>

<Dropzone {accept} {handleFiles} {filesNumber} />

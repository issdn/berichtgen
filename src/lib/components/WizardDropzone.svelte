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
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import { toast } from 'svelte-sonner';
	import { getContext } from 'svelte';
	import { CONFIG_FILENAME_REGEX } from '$src/lib/constants';
	import { readCsvConfig } from '$src/lib/parse/config_reader';
	import { FileTypes, ScanReturnType } from '$src/lib/enums';
	import { get2DimensionalDirectories } from '$src/lib/parse/file_scan';

	let { loggedIn } = getContext<UserContext>('user')();

	let error: string | null = $state(null);

	async function handleFiles(items: DataTransferItemList) {
		error = null;
		try {
			const directories = (await get2DimensionalDirectories(
				items,
				ScanReturnType.FILE
			)) as WizardRawDirectories;
			const anyNonJsonFiles = directories.flat().find((f) => f.type !== FileTypes.JSON);
			if (loggedIn) {
				const hasDiscount = berichtgenStore.currentProvider?.token != null;
				const totalTokens = countUserTokensDirectories(directories);
				const necessaryTokensAfterDiscount = hasDiscount ? totalTokens / 4 : totalTokens;
				if (necessaryTokensAfterDiscount > berichtgenStore.userTokens!) {
					toast.error(
						'Die Dateien vor der Verarbeitung benötigen mehr Tokens als du hast. (Es kann aber sein, dass nach der Verarbeitung z.B. der Bilder weniger Tokens benötigt werden.)'
					);
				}
				init(directories);
			} else {
				if (anyNonJsonFiles) {
					error =
						'Du musst angemeldet sein um andere Dateien parsen und umformulieren zu können! Bitte lade nur JSON-Dateien hoch.';
					wizardScheduler.schedule = null;
				} else {
					if (berichtgenStore.rewordJSON === true) {
						berichtgenStore.rewordJSON = false;
						toast.info('JSON-Dateien Umformulierung wurde automatisch deaktiviert.');
					}
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
			const resolvedDirectories = await Promise.all(directories.map(resolveDirectory));
			wizardScheduler.createSchedule(resolvedDirectories);
			wizardScheduler.runFirstBatch();
		})();
	}

	async function resolveDirectory(files: WizardRawDirectory): Promise<WizardDirectory> {
		const configFile = files.find((file) => CONFIG_FILENAME_REGEX.test(file.name)) || null;
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
				return otherFiles;
			},
			(err) => {
				toast.error(`Fehler beim Lesen der Konfiguration: ${err.message || 'Unbekannter Fehler'}`);
				return otherFiles;
			}
		);
	}
</script>

<Dropzone {handleFiles} />

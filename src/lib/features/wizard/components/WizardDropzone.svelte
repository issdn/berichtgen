<script lang="ts">
	import type {
		CSVConfigFile,
		WizardDirectory,
		WizardDirectoryEntry,
		WizardFileEntry,
		WizardRawDirectories,
		WizardRawDirectory
	} from '$wizard/types';
	import Dropzone from '$core/components/Dropzone.svelte';
	import { readCsvConfig } from '$core/config/services/config_reader';
	import { ScanReturnValue } from '$core/types';
	import { CONFIG_FILENAME_REGEX } from '$lib/constants';
	import {
		get2DimensionalDirectories,
		getFileListWithPreserverFolderStructure
	} from '$core/scan/file_scan';
	import { FileTypes } from '$wizard/enums';
	import { BerichtgenError, ECommonServerError } from '$lib/errors';
	import { tryResultAsync } from '$lib/result';
	import { useWizardMediatorContext } from '$wizard/services/wizard_mediator.svelte';
	import { toast } from 'svelte-sonner';
	import { page } from '$app/state';

	const wizardMediator = useWizardMediatorContext();

	let filesNumber = $state(0);
	let accept = $derived(page.data.loggedIn ? undefined : '.json');

	/**
	 * Normalizes dropped/selected input items to wizard raw directories.
	 */
	async function scanDirectories(
		items: DataTransferItemList | FileList
	): Promise<WizardRawDirectories> {
		if (items instanceof FileList) {
			return getFileListWithPreserverFolderStructure(items);
		}
		return (await get2DimensionalDirectories(
			items,
			ScanReturnValue.FILE
		)) as WizardRawDirectories;
	}

	async function handleFiles(items: DataTransferItemList | FileList) {
		const scanResult = await tryResultAsync(
			scanDirectories(items),
			BerichtgenError,
			ECommonServerError.INTERNAL_ERROR
		);
		if (!scanResult.ok) {
			toast.error(
				'Fehler beim Scannen der Dateien: ' + scanResult.error.message
			);
			return;
		}

		const directories = scanResult.data;
		filesNumber = directories.flat().length;
		const anyNonJsonFiles = directories
			.flat()
			.find((f) => f.type !== FileTypes.JSON);

		if (page.data.loggedIn) {
			init(directories);
			return;
		}

		if (anyNonJsonFiles) {
			toast.error(
				'Du musst angemeldet sein um andere Dateien parsen und umformulieren zu können! Bitte lade nur JSON-Dateien hoch.'
			);
			wizardMediator.schedule = null;
			void wizardMediator.clearPersistedSession();
			return;
		}

		init(directories);
	}

	function init(directories: WizardRawDirectories) {
		wizardMediator.processInit = (async () => {
			await wizardMediator.clearPersistedSession();
			await wizardMediator.init();
			const resolvedDirectories = await Promise.all(
				directories.map(resolveDirectory)
			);
			wizardMediator.createSchedule(resolvedDirectories);
			wizardMediator.schedule?.forEach((process) =>
				wizardMediator.queue.enqueue(process)
			);
		})();
	}

	async function resolveDirectory(
		files: WizardRawDirectory
	): Promise<WizardDirectory> {
		const configFile =
			files.find((f) => CONFIG_FILENAME_REGEX.test(f.name)) ?? null;
		const dataFiles = files.filter((f) => !CONFIG_FILENAME_REGEX.test(f.name));
		const entries: WizardDirectory = dataFiles.map(fileToEntry);

		if (configFile === null) return entries;

		const config = await readCsvConfig(configFile);
		if (!config.ok) {
			toast.error(
				`Fehler beim Lesen der Konfiguration: ${config.error.message || 'Unbekannter Fehler'}`
			);
			return entries;
		}

		return applyConfig(entries, config.data);
	}

	function fileToEntry(file: File): WizardDirectoryEntry {
		if (file.type === 'text/uri-list') return { url: file.name };
		return { file };
	}

	function applyConfig(
		entries: WizardDirectory,
		configRows: CSVConfigFile[]
	): WizardDirectory {
		const fileEntries = new Map(
			entries
				.filter((e): e is WizardFileEntry => 'file' in e)
				.map((e) => [e.file.name, e])
		);
		const notFound: string[] = [];

		for (const { file, ort, ranges } of configRows) {
			const config = { ranges: ranges.map((r, i) => ({ ...r, id: i })), ort };
			if (URL.canParse(file)) {
				entries.push({ url: file, config });
			} else if (fileEntries.has(file)) {
				fileEntries.get(file)!.config = config;
			} else {
				notFound.push(file);
			}
		}

		const configuredFileCount = configRows.filter(
			({ file }) => !URL.canParse(file)
		).length;
		if (configuredFileCount < fileEntries.size) {
			toast('Nicht alle Dateien in der Konfiguration gefunden.');
		}
		if (notFound.length > 0) {
			toast.error(
				`Die folgenden Dateien aus der Konfig wurden nicht hochgeladen: ${notFound.join(', ')}`
			);
		}

		return entries;
	}
</script>

<Dropzone {accept} {handleFiles} {filesNumber} />

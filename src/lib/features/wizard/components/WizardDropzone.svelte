<script lang="ts">
	import type {
		WizardDirectory,
		WizardRawDirectories,
		WizardRawDirectory
	} from '$wizard/types';

	import { page } from '$app/state';
	import Dropzone from '$core/components/Dropzone.svelte';
	import { readCsvConfig } from '$core/config/services/config_reader';
	import { scanDroppedInput } from '$core/scan/file_scan';
	import { ScanReturnValue } from '$core/types';
	import { CONFIG_FILENAME_REGEX } from '$lib/constants';
	import { ECommonServerError } from '$lib/errors';
	import { tryResultAsync } from '$lib/result';
	import {
		applyConfigToEntries,
		hasAnyNonJsonFiles,
		splitDirectoryFiles,
		validateWizardDropFile
	} from '$wizard/components/wizard_dropzone.helpers';
	import { FileTypes } from '$wizard/enums';
	import { WizardFile } from '$wizard/services/wizard_file';
	import { wizardMediatorContext } from '$wizard/services/wizard_mediator.svelte';
	import { toast } from 'svelte-sonner';

	const wizardMediator = wizardMediatorContext.get();

	let accept = $derived(
		page.data.loggedIn ? Object.values(FileTypes).join(',') : FileTypes.JSON
	);

	const isValidFile = (file: File): void => {
		validateWizardDropFile({ accept, file, loggedIn: page.data.loggedIn });
	};

	async function handleFiles(items: DataTransferItemList | FileList) {
		const scanResult = await tryResultAsync({
			apiError: ECommonServerError.INTERNAL_ERROR,
			promise: scanDroppedInput(items, ScanReturnValue.FILE, isValidFile)
		});
		if (!scanResult.ok) {
			toast.error(scanResult.error.message, {
				description: scanResult.error.apiError.cause
			});
			return;
		}

		const directories = scanResult.data;
		if (directories.flat().length === 0) {
			toast.error('Keine gueltigen Dateien gefunden.');
			return;
		}

		if (!page.data.loggedIn && hasAnyNonJsonFiles({ directories })) {
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
		})();
	}

	async function resolveDirectory(
		files: WizardRawDirectory
	): Promise<WizardDirectory> {
		const { configFile, dataFiles } = splitDirectoryFiles({
			configFilePattern: CONFIG_FILENAME_REGEX,
			files
		});
		const entries: WizardDirectory = dataFiles.map((file) =>
			WizardFile.fromFile({ file })
		);

		if (configFile === null) return entries;

		const config = await readCsvConfig(configFile);
		if (!config.ok) {
			toast.error(
				`Fehler beim Lesen der Konfiguration: ${config.error.message || 'Unbekannter Fehler'}`
			);
			return entries;
		}

		const applied = applyConfigToEntries({
			configRows: config.data,
			entries
		});

		if (applied.missingConfiguredFiles) {
			toast.error('Nicht alle Dateien in der Konfiguration gefunden.');
		}
		if (applied.notFound.length > 0) {
			toast.error(
				`Die folgenden Dateien aus der Konfig wurden nicht hochgeladen: ${applied.notFound.join(', ')}`
			);
		}

		return applied.entries;
	}
</script>

<Dropzone
	class="h-64 min-h-0 md:h-full"
	{accept}
	{handleFiles}
	filesNumber={wizardMediator.schedule?.length}
	{isValidFile}
/>

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
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import Button from '$src/lib/components/ui/button/button.svelte';
	import { goto } from '$app/navigation';
	import { readCsvConfig } from '$src/lib/parse/config_reader';
	import { getArrayDepth } from '$src/lib/utils/math';
	import { FileTypes } from '$src/lib/enums';

	let { loggedIn } = getContext<UserContext>('user')();

	let error: string | null = $state(null);
	let dialogOpen = $derived(error !== null);

	async function init(directories: WizardRawDirectories) {
		wizardScheduler.directories = await Promise.all(directories.map(resolveDirectory));
		wizardScheduler.processInit = wizardScheduler.init();
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
		config.match(
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
		return otherFiles;
	}

	async function handleFiles(files: DataTransferItemList) {
		error = null;
		try {
			const dirs = await Promise.all(
				[...files].map((item) => {
					const entry = item.webkitGetAsEntry();
					return scanFiles(entry!);
				})
			);
			const depth = getArrayDepth(dirs);
			const directories = dirs.flat(depth > 2 ? depth - 2 : 0) as WizardRawDirectories;
			const anyNonJsonFiles = directories.flat().find((f) => f.type !== FileTypes.JSON);
			if (loggedIn) {
				startIfEnoughTokens(directories, anyNonJsonFiles);
			} else {
				if (anyNonJsonFiles) {
					error =
						'Du musst angemeldet sein um andere Dateien parsen und umformulieren zu können! Bitte lade nur JSON-Dateien hoch.';
					wizardScheduler.directories = null;
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

	function startIfEnoughTokens(files: WizardRawDirectories, anyNonJsonFiles: File | undefined) {
		const hasDiscount = berichtgenStore.currentProvider?.token != null;
		const totalTokens = countUserTokensDirectories(files);
		const necessaryTokensAfterDiscount = hasDiscount ? totalTokens / 4 : totalTokens;
		if (necessaryTokensAfterDiscount > berichtgenStore.userTokens!) {
			if (!anyNonJsonFiles) {
				if (berichtgenStore.rewordJSON === true) {
					berichtgenStore.rewordJSON = false;
					toast.info('JSON-Dateien Umformulierung wurde automatisch deaktiviert.');
				}
				init(files);
			} else {
				error = `Du hast ${berichtgenStore.userTokens} Tokens. Die Dateien, die du hochgeladen hast, benötigen ${totalTokens} Tokens.`;
				wizardScheduler.directories = null;
			}
		} else {
			init(files);
		}
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
			const readFilePromise = new Promise<File>((resolve, reject) => {
				(item as FileSystemFileEntry).file(resolve, reject);
			});

			return [...items, await readFilePromise] as WizardRawDirectories;
		}
		return items;
	}
</script>

<Dropzone {handleFiles} />

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Nicht genüg Tokens 🥲</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-y-2 pt-4">
			<p>{error}</p>
			<div class="flex w-full flex-row justify-end">
				<Button onclick={() => goto('/board/user/kauf')}>Tokens kaufen</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

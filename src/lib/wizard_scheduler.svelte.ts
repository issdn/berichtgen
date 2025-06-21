import type { Scheduler } from 'tesseract.js';
import { combineJSONs } from './parse/combine';
import { WizardFileContext } from './wizard_file_context.svelte';
import { createStateMachineForContext } from './state_machine.svelte';
import type { Entry, ResultEntry } from './types';
import { readCsvConfig } from '$src/lib/parse/config_reader';
import { toast } from 'svelte-sonner';
import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
export class WizardScheduler {
	batchSize = 5;

	files: File[] | null = $state(null);

	configFile: File | null = $state(null);

	schedule: ReturnType<WizardScheduler['createProcessStateMachine']>[] | null = $derived.by(() => {
		if (this.files === null || this.files.length === 0) return null;
		return [...this.files!].map((file) => {
			return this.createProcessStateMachine(file);
		});
	});

	filesReady = $state(0);

	filesUnfinished = $state(0);

	scheduler: Scheduler | null = null;

	result = $state<Promise<ResultEntry[]> | null>(null);

	processInit = $state<Promise<void> | null>(null);

	isRunning = $state(false);

	workersInUse = 0;

	workersNr = 0;

	async init() {
		this.isRunning = true;
		if (this.scheduler === null) {
			const { createScheduler } = await import('tesseract.js');
			this.scheduler = createScheduler();
		}
		this.result = null;
		this.filesReady = 0;
		this.filesUnfinished = 0;
		await this.setRangesFromConfig();
		for (let i = 0; i < this.batchSize; i++) {
			this.schedule?.at(i)?.machine.run();
		}
	}

	finish() {
		this.result = (async () => {
			const finishedFiles = this.schedule!.reduce((prev, { context }) => {
				if (context.finished != null) return [...prev, context.finished];
				return prev;
			}, [] as Required<Entry>[][]);
			await this.scheduler?.terminate();
			const combined = combineJSONs(finishedFiles, berichtgenStore.contantHours);
			this.isRunning = false;
			return combined;
		})();
	}

	createProcessStateMachine(file: File) {
		const context = new WizardFileContext(file);
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const scheduler = this;

		const machine = createStateMachineForContext(context, scheduler);
		return { context, machine };
	}

	async setRangesFromConfig() {
		if (this.configFile === null) return;
		const contextByFilename = new Map<string, WizardFileContext>();
		this.schedule!.forEach(({ context }) => {
			contextByFilename.set(context.file.name, context);
		});
		const config = await readCsvConfig(this.configFile);
		const notFoundFiles: string[] = [];
		config.match(
			(config) => {
				config.forEach(({ file, ort, ranges }) => {
					const context = contextByFilename.get(file);
					if (context) {
						context.dateRanges = {
							ranges: ranges.map((obj, i) => ({ ...obj, id: i })),
							location: ort
						};
					} else {
						notFoundFiles.push(file);
					}
				});
				if (config.length < this.files!.length) {
					toast('Nicht alle Dateien in der Konfiguration gefunden.');
				}
				if (notFoundFiles.length > 0) {
					toast.error(
						`Die folgenden Dateien aus der Konfig wurden nicht hochgeladen: ${notFoundFiles.join(', ')}`
					);
				}
			},
			(err) => {
				toast.error(`Fehler beim Lesen der Konfiguration: ${err.message || 'Unbekannter Fehler'}`);
			}
		);
	}
}

// eslint-disable-next-line prefer-const
export let wizardScheduler = new WizardScheduler();

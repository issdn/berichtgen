import type { Scheduler } from 'tesseract.js';
import { combineJSONs } from './parse/combine';
import { WizardFileContext } from './wizard_file_context.svelte';
import { createStateMachineForContext } from './state_machine.svelte';
import type { Entry, ResultEntry, WizardDirectories, WizardProcessStateMachine } from './types';
import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
import type { DateRangeSchema } from '$src/lib/schemas';
export class WizardScheduler {
	batchSize = 5;

	directories: WizardDirectories | null = $state(null);

	schedule: WizardProcessStateMachine[][] | null = $derived.by(() => {
		if (this.directories === null || this.directories.length === 0) return null;
		return [...this.directories].map((directory) => directory.map(this.createProcessStateMachine));
	});

	numberOfFiles = $derived.by(() => {
		if (this.schedule === null) return 0;
		return this.schedule.reduce((prev, directory) => prev + directory.length, 0);
	});

	filesReady = $state(0);

	filesUnfinished = $state(0);

	scheduler: Scheduler | null = null;

	result = $state<Promise<ResultEntry[]> | null>(null);

	processInit = $state<Promise<void> | null>(null);

	isRunning = $state(false);

	workersInUse = 0;

	workersNr = 0;

	get isDone() {
		return this.directories !== null && this.filesReady === this.numberOfFiles;
	}

	async init() {
		if (this.schedule === null) {
			return;
		}
		this.isRunning = true;
		if (this.scheduler === null) {
			const { createScheduler } = await import('tesseract.js');
			this.scheduler = createScheduler();
		}
		this.result = null;
		this.filesReady = 0;
		this.filesUnfinished = 0;
		for (let i = 0; i < this.batchSize; i++) {
			this.schedule[0].at(i)?.machine.run();
		}
	}

	finish() {
		this.result = (async () => {
			const finishedDirectories = this.schedule!.map((directory) =>
				directory.reduce((prev, { context }) => {
					if (context.finished != null) return [...prev, context.finished];
					return prev;
				}, [] as Required<Entry>[][])
			);
			await this.scheduler?.terminate();
			const combined = combineJSONs(finishedDirectories.flat(), berichtgenStore.contantHours);
			this.isRunning = false;
			return combined;
		})();
	}

	createProcessStateMachine({
		file,
		config = null
	}: {
		file: File;
		config?: DateRangeSchema | null | undefined;
	}) {
		const context = new WizardFileContext(file, config);
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const scheduler = this;

		const machine = createStateMachineForContext(context, scheduler);
		return { context, machine };
	}

	runNext() {
		this.schedule!.flat()
			.at(this.filesReady + this.batchSize - 1)
			?.machine.run();
	}
}

// eslint-disable-next-line prefer-const
export let wizardScheduler = new WizardScheduler();

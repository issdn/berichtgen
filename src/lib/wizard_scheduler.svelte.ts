import type { Scheduler } from 'tesseract.js';
import { combineJSONs } from './parse/combine';
import { WizardFileContext } from './wizard_file_context.svelte';
import { createStateMachineForContext } from './state_machine';
import type {
	Entry,
	ResultEntry,
	WizardDirectories,
	WizardProcessStateMachine
} from './types';
import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
import type { DateRangeSchema } from '$src/lib/schemas';

export class WizardScheduler {
	queue: WizardProcessStateMachine[] = [];

	schedule: WizardProcessStateMachine[] | null = $state(null);

	numberOfFiles = $derived.by(() => {
		if (this.schedule === null) return 0;
		return this.schedule.length;
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
		return this.schedule !== null && this.filesReady === this.numberOfFiles;
	}

	get batchSize() {
		return 5;
	}

	enqueue = (item: WizardProcessStateMachine) => {
		this.queue.push(item);
		if (this.queue.length <= this.batchSize) {
			this.queue.at(-1)!.machine.run();
		}
	};

	dequeue = (): WizardProcessStateMachine | undefined => {
		const shifted = this.queue.shift();
		this.filesReady += 1;
		this.queue.at(this.batchSize)?.machine.run();
		if (this.isDone) {
			this.finish();
		}
		return shifted;
	};

	init = async () => {
		this.isRunning = true;
		if (this.scheduler === null) {
			const { createScheduler } = await import('tesseract.js');
			this.scheduler = createScheduler();
		}
		this.queue = [];
		this.result = null;
		this.filesReady = 0;
		this.filesUnfinished = 0;
	};

	createSchedule = (directories: WizardDirectories) => {
		this.schedule = [...directories].flat().map(this.createProcessStateMachine);
	};

	finish = () => {
		this.result = (async () => {
			const finishedDirectories = this.schedule!.reduce((prev, { context }) => {
				if (context.finished != null) return [...prev, context.finished];
				return prev;
			}, [] as Required<Entry>[][]);
			await this.scheduler?.terminate();
			this.scheduler = null;
			const combined = combineJSONs(
				finishedDirectories,
				berichtgenStore.constantHours
			);
			this.isRunning = false;
			return combined;
		})();
	};

	createProcessStateMachine = ({
		file,
		config = null
	}: {
		file: File;
		config?: DateRangeSchema | null | undefined;
	}) => {
		const context = new WizardFileContext(file, config);
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const scheduler = this;

		const machine = createStateMachineForContext(context, scheduler);
		// For some insane fucking reason the run method is removed by the something if not accessed
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		machine.run;
		return { context, machine, id: crypto.randomUUID() };
	};
}

// eslint-disable-next-line prefer-const
export let wizardScheduler = new WizardScheduler();

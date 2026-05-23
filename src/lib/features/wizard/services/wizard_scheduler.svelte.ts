import type { WizardStep } from '$wizard/enums';
import type {
	Entry,
	WizardDirectoryEntry,
	WizardDirectories,
	WizardProcessStateMachine
} from '$wizard/types';
import type { WizardPersistedFile } from './types';

type FilesStates = Record<WizardStep, number>;

export class WizardScheduler {
	schedule: WizardProcessStateMachine[] | null = $state(null);

	numberOfFiles = $derived.by(() => {
		if (this.schedule === null) return 0;
		return this.schedule.length;
	});

	filesStates = $derived.by<FilesStates | null>(() => {
		if (this.schedule === null) return null;

		const counts: FilesStates = {
			init: 0,
			process: 0,
			waiting: 0,
			batch_pending: 0,
			completion: 0,
			time_spread: 0,
			done: 0,
			cancelled: 0,
			error: 0
		};

		for (const process of this.schedule) {
			counts[process.machine.current]++;
		}

		return counts;
	});

	clear() {
		this.schedule = null;
	}

	setSchedule(schedule: WizardProcessStateMachine[] | null) {
		this.schedule = schedule;
	}

	createSchedule(
		directories: WizardDirectories,
		createProcess: (entry: WizardDirectoryEntry) => WizardProcessStateMachine
	) {
		this.schedule = [...directories]
			.flat()
			.map((entry) => createProcess(entry));
	}

	findById(id: string): WizardProcessStateMachine | undefined {
		return this.schedule?.find((file) => file.id === id);
	}

	getFinishedDirectories(): Required<Entry>[][] {
		if (!this.schedule) return [];
		return this.schedule.reduce((prev, { context }) => {
			if (context.finished != null) return [...prev, context.finished];
			return prev;
		}, [] as Required<Entry>[][]);
	}

	toPersistedFiles(): WizardPersistedFile[] {
		return (this.schedule ?? []).map((process) => ({
			id: process.id,
			step: process.machine.current,
			...process.context,
			error: process.context.error?.apiError
		}));
	}
}

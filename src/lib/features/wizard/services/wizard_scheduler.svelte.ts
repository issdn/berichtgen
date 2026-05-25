import type { WizardStep } from '$wizard/enums';
import type {
	Entry,
	WizardDirectories,
	WizardDirectoryEntry,
	WizardPersistedFile,
	WizardProcessStateMachine
} from '$wizard/types';

type FilesStates = Record<WizardStep, number>;

export class WizardScheduler {
	schedule: null | WizardProcessStateMachine[] = $state(null);

	filesStates = $derived.by<FilesStates | null>(() => {
		if (this.schedule === null) return null;

		const counts: FilesStates = {
			batch_pending: 0,
			cancelled: 0,
			completion: 0,
			done: 0,
			error: 0,
			init: 0,
			process: 0,
			time_spread: 0,
			waiting: 0
		};

		for (const process of this.schedule) {
			counts[process.machine.current]++;
		}

		return counts;
	});

	numberOfFiles = $derived.by(() => {
		if (this.schedule === null) return 0;
		return this.schedule.length;
	});

	clear() {
		this.schedule = null;
	}

	createSchedule(
		directories: WizardDirectories,
		createProcess: (entry: WizardDirectoryEntry) => WizardProcessStateMachine
	) {
		this.schedule = [...directories]
			.flat()
			.map((entry) => createProcess(entry));
	}

	findById(id: string): undefined | WizardProcessStateMachine {
		return this.schedule?.find((file) => file.id === id);
	}

	getFinishedDirectories(): Required<Entry>[][] {
		if (!this.schedule) return [];
		return this.schedule.reduce((prev, { context }) => {
			if (context.finished != null) return [...prev, context.finished];
			return prev;
		}, [] as Required<Entry>[][]);
	}

	setSchedule(schedule: null | WizardProcessStateMachine[]) {
		this.schedule = schedule;
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

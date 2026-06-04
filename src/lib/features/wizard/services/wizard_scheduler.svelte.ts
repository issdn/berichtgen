import type {
	TimeSpreadResult,
	WizardDirectories,
	WizardPersistedFile,
	WizardProcessStateMachine
} from '$wizard/types';

import { WizardStep } from '$wizard/enums';

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
		createProcess: (file: File) => WizardProcessStateMachine
	) {
		this.schedule = [...directories].flat().map((file) => createProcess(file));
	}

	findById(id: string): undefined | WizardProcessStateMachine {
		return this.schedule?.find((file) => file.id === id);
	}

	getFinishedDirectories() {
		if (!this.schedule) return [];
		return this.schedule.reduce((prev, { context, machine }) => {
			if (machine.current === WizardStep.DONE)
				return [...prev, context.snapshot as TimeSpreadResult];
			return prev;
		}, [] as TimeSpreadResult[]);
	}

	/** Removes a single process from the current schedule by ID. */
	removeById({ id }: { id: string }): boolean {
		if (this.schedule === null) return false;

		const next = this.schedule.filter((process) => process.id !== id);
		if (next.length === this.schedule.length) return false;

		this.schedule = next.length > 0 ? next : null;
		return true;
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

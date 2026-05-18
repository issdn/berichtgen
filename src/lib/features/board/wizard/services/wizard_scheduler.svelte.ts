import type {
	Entry,
	WizardDirectoryEntry,
	WizardDirectories,
	WizardProcessStateMachine
} from '$wizard/types';
import type { WizardPersistedFile } from './types';
import type { WizardStep } from '$wizard/enums';
import { get } from 'svelte/store';

export class WizardScheduler {
	schedule: WizardProcessStateMachine[] | null = $state(null);

	numberOfFiles = $derived.by(() => {
		if (this.schedule === null) return 0;
		return this.schedule.length;
	});

	filesReady = $derived.by(() => {
		if (this.schedule === null) return 0;
		return this.schedule.filter(
			(process) =>
				process.context.finished !== null ||
				process.context.error !== undefined ||
				process.context.cancelled
		).length;
	});

	clear() {
		this.schedule = null;
	}

	setSchedule(schedule: WizardProcessStateMachine[] | null) {
		this.schedule = schedule;
	}

	createSchedule(
		directories: WizardDirectories,
		createProcess: (
			entry: WizardDirectoryEntry
		) => WizardProcessStateMachine
	) {
		this.schedule = [...directories].flat().map((entry) => createProcess(entry));
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
			step: get(process.machine) as WizardStep,
			...process.context,
			error: process.context.error?.apiError
		}));
	}
}

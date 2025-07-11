import { FileTypes, type Entry, type ResultEntry } from '$lib/types';
import type { IncuriaError } from '$src/lib/errors';
import type { DateRangeSchema } from '$src/lib/schemas';
import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';

export class WizardFileContext {
	snapshot: string | Entry[] | ResultEntry[] | undefined;

	finished: ResultEntry[] | null = null;

	dateRanges: DateRangeSchema | null = $state(null);

	value: number = $state(0);

	max: number = $state(0);

	error?: IncuriaError;

	file: File;

	cancelled: boolean = false;

	get shouldSkip() {
		return this.file.type === FileTypes.JSON && berichtgenStore.rewordJSON;
	}

	onProgress() {
		this.value += 1;
	}

	constructor(file: File, dateRanges: DateRangeSchema | null | undefined = null) {
		this.file = file;
		this.dateRanges = dateRanges ?? null;
	}
}

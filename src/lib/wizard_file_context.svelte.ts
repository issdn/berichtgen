import { type Entry, type ResultEntry } from '$lib/types';
import { FileTypes } from '$src/lib/enums';
import type { ***REMOVED***Error } from '$src/lib/errors';
import type { DateRangeSchema } from '$src/lib/schemas';
import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';

export class WizardFileContext {
	snapshot: string | Entry[] | ResultEntry[] | undefined;

	finished: ResultEntry[] | null = null;

	dateRanges: DateRangeSchema | null = $state(null);

	error?: ***REMOVED***Error;

	file: File;

	cancelled: boolean = false;

	get shouldSkip() {
		return this.file.type === FileTypes.JSON && !berichtgenStore.rewordJSON;
	}

	constructor(
		file: File,
		dateRanges: DateRangeSchema | null | undefined = null
	) {
		this.file = file;
		this.dateRanges = dateRanges ?? null;
	}
}

import type { Entry, ResultEntry } from '../types';
import type { DateRangeSchema } from '../schemas';
import { ***REMOVED***Error } from '$lib/errors';
import { FileTypes } from '../enums';
import { berichtgenStore } from '$lib/stores/berichtgen.svelte';

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

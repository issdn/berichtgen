import type { Entry, ResultEntry } from '../types';
import type { DateRangeSchema } from '../schemas';
import { FileTypes } from '../enums';
import { berichtgenStore } from '$lib/stores/berichtgen.svelte';
import type { FileRouting } from './file_routing';
import type { ***REMOVED***Error } from '$lib/errors';

export class WizardFileContext {
	snapshot: FileRouting | Entry[] | ResultEntry[] | undefined;

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

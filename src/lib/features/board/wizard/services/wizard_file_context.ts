import type { Entry, ResultEntry } from '../types';
import type { DateRangeSchema } from '../schemas';
import type { FileRouting } from './file_routing';
import type { ***REMOVED***Error } from '$lib/errors';

export class WizardFileContext {
	snapshot: FileRouting | Entry[] | ResultEntry[] | undefined;

	finished: ResultEntry[] | null = null;

	dateRanges: DateRangeSchema | null = null;

	error?: ***REMOVED***Error;

	file: File | string;

	cancelled: boolean = false;

	constructor(
		file: File | string,
		dateRanges: DateRangeSchema | null | undefined = null
	) {
		this.file = file;
		this.dateRanges = dateRanges ?? null;
	}
}

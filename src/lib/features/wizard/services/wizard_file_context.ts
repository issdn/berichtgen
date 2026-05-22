import type { WizardDirectoryEntry } from '../types';
import type { Entry, ResultEntry } from '../types';
import type { DateRangeSchema } from '../schemas';
import type { FileRouting } from './file_routing';
import type { BerichtgenError } from '$lib/errors';
import { BerichtgenError as BerichtgenErrorClass } from '$lib/errors';
import type { WizardPersistedFile } from './types';

export class WizardFileContext {
	snapshot: FileRouting | Entry[] | ResultEntry[] | undefined;

	finished: ResultEntry[] | null = null;

	dateRanges: DateRangeSchema | null = null;

	error?: BerichtgenError;

	file: WizardDirectoryEntry;

	cancelled: boolean = false;

	constructor(file: WizardDirectoryEntry) {
		this.file = file;
		this.dateRanges = file.config ?? null;
	}

	static rehydrate(file: WizardPersistedFile) {
		const context = new WizardFileContext(file.file);
		context.snapshot = file.snapshot ?? undefined;
		context.finished = file.finished;
		context.cancelled = file.cancelled;
		context.error = file.error
			? new BerichtgenErrorClass(file.error)
			: undefined;
		return context;
	}
}

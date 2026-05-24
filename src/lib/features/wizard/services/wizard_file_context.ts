import type { BerichtgenError } from '$lib/errors';

import { BerichtgenError as BerichtgenErrorClass } from '$lib/errors';

import type { DateRangeSchema } from '../schemas';
import type { FileRouting, WizardDirectoryEntry } from '../types';
import type { Entry, ResultEntry } from '../types';
import type { WizardPersistedFile } from './types';

export class WizardFileContext {
	cancelled: boolean = false;

	dateRanges: DateRangeSchema | null = null;

	entry: WizardDirectoryEntry;

	error?: BerichtgenError;

	finished: null | ResultEntry[] = null;

	snapshot: Entry[] | FileRouting | ResultEntry[] | undefined;

	constructor(entry: WizardDirectoryEntry) {
		this.entry = entry;
		this.dateRanges = entry.config ?? null;
	}

	static rehydrate(file: WizardPersistedFile) {
		const context = new WizardFileContext(file.entry);
		context.snapshot = file.snapshot ?? undefined;
		context.finished = file.finished;
		context.cancelled = file.cancelled;
		context.error = file.error
			? new BerichtgenErrorClass(file.error)
			: undefined;
		return context;
	}
}

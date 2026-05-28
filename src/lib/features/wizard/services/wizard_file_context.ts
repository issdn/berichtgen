import type { BerichtgenError } from '$lib/errors';

import { BerichtgenError as BerichtgenErrorClass } from '$lib/errors';
import { WizardStep } from '$wizard/enums';
import { type FileRouting, restoreFileRouting } from '$wizard/services/routing';

import type { DateRangeSchema } from '../schemas';
import type { WizardDirectoryEntry, WizardPersistedFile } from '../types';
import type { Entry, ResultEntry } from '../types';

export class WizardFileContext {
	dateRanges: DateRangeSchema | null = null;

	entry: WizardDirectoryEntry;

	error?: BerichtgenError;

	lastState: null | WizardStep = null;

	snapshot: Entry[] | FileRouting | ResultEntry[] | undefined;

	constructor(
		entry: WizardDirectoryEntry,
		lastState: null | WizardStep = null
	) {
		this.entry = entry;
		this.dateRanges = entry.config ?? null;
		this.lastState = lastState;
	}

	static rehydrate(file: WizardPersistedFile) {
		const context = new WizardFileContext(file.entry);
		if (
			file.snapshot !== null &&
			typeof file.snapshot === 'object' &&
			'type' in file.snapshot
		) {
			context.snapshot = restoreFileRouting({ value: file.snapshot });
		} else {
			context.snapshot = file.snapshot ?? undefined;
		}
		context.error = file.error
			? new BerichtgenErrorClass(file.error)
			: undefined;
		context.lastState = file.step;
		return context;
	}
}

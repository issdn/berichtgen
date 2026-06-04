import type { BerichtgenError } from '$lib/errors';

import { BerichtgenError as BerichtgenErrorClass } from '$lib/errors';
import { WizardStep } from '$wizard/enums';
import { type FileRouting, restoreFileRouting } from '$wizard/services/routing';
import { WizardFile } from '$wizard/services/wizard_file';

import type { DateRangeSchema } from '../schemas';
import type { GenaiCompletionResult, WizardPersistedFile } from '../types';
import type { CompletionResult } from '../types';

/** Holds per-file wizard runtime state across processing steps. */
export class WizardFileContext {
	dateRanges: DateRangeSchema | null = null;

	error?: BerichtgenError;

	file: WizardFile;

	lastState: null | WizardStep = null;

	snapshot: CompletionResult | FileRouting | GenaiCompletionResult | undefined;

	constructor(file: File, lastState: null | WizardStep = null) {
		this.file = WizardFile.fromFile({ file });
		this.dateRanges = this.file.config ?? null;
		this.lastState = lastState;
	}

	/** Restores wizard runtime context from persisted storage. */
	static rehydrate({
		file,
		snapshot,
		error,
		step,
		dateRanges
	}: WizardPersistedFile) {
		const context = new WizardFileContext(file);
		if (
			snapshot !== null &&
			typeof snapshot === 'object' &&
			'type' in snapshot
		) {
			context.snapshot = restoreFileRouting({ value: snapshot });
		} else {
			context.snapshot = snapshot ?? undefined;
		}
		context.dateRanges = dateRanges ?? null;
		context.error = error ? new BerichtgenErrorClass(error) : undefined;
		context.lastState = step;
		return context;
	}
}

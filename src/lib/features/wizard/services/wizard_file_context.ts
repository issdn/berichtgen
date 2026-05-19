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

	constructor(
		file: WizardDirectoryEntry | File | string,
		dateRanges: DateRangeSchema | null | undefined = null
	) {
		this.file =
			typeof file === 'string'
				? { url: file }
				: file instanceof File
					? { file }
					: file;
		this.dateRanges = dateRanges ?? null;
	}

	static rehydrate(file: WizardPersistedFile) {
		const context = new WizardFileContext(file.file, file.dateRanges);
		context.snapshot = file.snapshot ?? undefined;
		context.finished = file.finished;
		context.cancelled = file.cancelled;
		context.error = file.error
			? new BerichtgenErrorClass(file.error)
			: undefined;
		return context;
	}
}

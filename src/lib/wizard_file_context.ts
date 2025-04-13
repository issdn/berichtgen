import type { DateRangeSchema } from '$lib/components/time_spread_schematic';
import type { Entry } from '$lib/types';

import type { IncuriaError } from '$lib/types';

export class WizardFileContext {
	snapshot: string | Entry[] | Required<Entry>[] | undefined;

	finished: Required<Entry>[] | null = null;

	dateRanges: DateRangeSchema['values'] = $state([]);

	value: number = $state(0);

	max: number = $state(0);

	error?: IncuriaError;

	file: File;

	cancelled: boolean = false;

	onProgress() {
		this.value += 1;
	}

	constructor(file: File) {
		this.file = file;
	}
}

import type { Attributes, ReplaceAttr } from '$core/types';
import type { BerichtgenError } from '$lib/errors';
import type { Ort } from '$wizard/enums';
import type { WizardStep } from '$wizard/enums';
import type { DateRangeSchema } from '$wizard/schemas';
import type { FileRouting } from '$wizard/services/routing';
import type { StateMachineSignature } from '$wizard/services/state_machine';
import type { WizardFileContext } from '$wizard/services/wizard_file_context';
import type { DateValue } from '@internationalized/date';

export type BatchErrorScope = 'file_scoped' | 'global';

export type BatchItem = {
	fileIndex: number;
	ort: Ort;
	routing: FileRouting;
};

export interface BerichtgenWeightedDateRange {
	daterange: {
		end: DateValue;
		start: DateValue;
	};
	stunden?: number;
}

export type CompletionResult = Entry[];

export type CSVConfig = CSVConfigFile[];

/**
 * Example: ort, file, start;end;[stunden], start;end;[stunden]
 *
 * See: $src/lib/parse/config_reader.ts
 */
export type CSVConfigFile = {
	file: string;
	ort: Ort;
	ranges: BerichtgenWeightedDateRange[];
};

export interface Entry {
	ausbildungsjahr?: number;
	datum?: string;
	endDatum?: string;
	ort?: Ort;
	stunden?: number;
	text: string;
}

export type ResultEntry = Required<Entry>;

export type WizardDirectories = WizardDirectory[];

export type WizardDirectory = WizardDirectoryEntry[];

export type WizardDirectoryEntry = WizardFileEntry | WizardUrlEntry;

export type WizardFileEntry = {
	config?: DateRangeSchema;
	file: File;
	type: 'file';
};

export type WizardPersistedFile = ReplaceAttr<
	Attributes<WizardFileContext>,
	'error',
	BerichtgenError['apiError'] | undefined
> & {
	id: string;
	step: WizardStep;
};

export type WizardPersistedSession = {
	files: WizardPersistedFile[];
	flushRequested: boolean;
	sessionId: string;
	updatedAt: number;
};

export type WizardProcessStateMachine = {
	/** Sets cancelled and advances the machine — call instead of mutating context directly. */
	cancel: () => void;
	/** Advances the machine when the user has confirmed their date ranges. */
	confirmDateRanges: () => void;
	context: WizardFileContext;
	id: string;
	machine: StateMachineSignature;
	/** Clears cancelled and re-enqueues the machine — call instead of mutating context directly. */
	restart: () => void;
};
export type WizardRawDirectories = File[][];
export type WizardRawDirectory = WizardRawDirectories[number];

export type WizardUrlEntry = {
	config?: DateRangeSchema;
	type: 'url';
	url: string;
};

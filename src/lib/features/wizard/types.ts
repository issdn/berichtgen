import type { Ort } from '$wizard/enums';
import type { DateRangeSchema } from '$wizard/schemas';
import type { StateMachineSignature } from '$wizard/services/state_machine';
import type { WizardFileContext } from '$wizard/services/wizard_file_context';
import type { DateValue } from '@internationalized/date';

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

/** Discriminated union of all possible file routing strategies. */
export type FileRouting = GcsRouting | InlineRouting | UrlRouting;

/** The file was uploaded directly to Google Cloud Storage. null means file already exists in the storage */
export type GcsRouting = {
	fileUri: string;
	mimeType: string;
	signedUrl: null | string;
	type: 'gcs';
};

/** The file is small enough (= 1 MB) to be sent inline as base64. */
export type InlineRouting = {
	data: string;
	mimeType: string;
	type: 'inline';
};

export type ResultEntry = Required<Entry>;

/** A web URL pasted by the user or specified in the config file. */
export type UrlRouting = {
	type: 'url';
	url: string;
};

export type WizardDirectories = WizardDirectory[];

export type WizardDirectory = WizardDirectoryEntry[];

export type WizardDirectoryEntry = WizardFileEntry | WizardUrlEntry;

export type WizardFileEntry = {
	config?: DateRangeSchema;
	file: File;
	type: 'file';
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

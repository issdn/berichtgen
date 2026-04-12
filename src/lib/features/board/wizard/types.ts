import type { Ort } from '$wizard/enums';
import type { DateRangeSchema } from '$wizard/schemas';
import type { StateMachineSignature } from '$wizard/services/state_machine';
import type { WizardFileContext } from '$wizard/services/wizard_file_context.svelte';
import type { DateValue } from '@internationalized/date';

export interface Entry {
	text: string;
	datum?: string;
	endDatum?: string;
	ort?: Ort;
	stunden?: number;
	ausbildungsjahr?: number;
}

export type ResultEntry = Required<Entry>;

export interface ***REMOVED***WeightedDateRange {
	daterange: {
		start: DateValue;
		end: DateValue;
	};
	stunden?: number;
}

/**
 * Example: ort, file, start;end;[stunden], start;end;[stunden]
 *
 * See: $src/lib/parse/config_reader.ts
 */
export type CSVConfigFile = {
	ort: Ort;
	file: string;
	ranges: ***REMOVED***WeightedDateRange[];
};

export type CSVConfig = CSVConfigFile[];

export type WizardRawDirectories = File[][];

export type WizardRawDirectory = WizardRawDirectories[number];

export type WizardFileEntry = { file: File; config?: DateRangeSchema };

export type WizardUrlEntry = { url: string; config?: DateRangeSchema };

export type WizardDirectoryEntry = WizardFileEntry | WizardUrlEntry;

export type WizardDirectory = WizardDirectoryEntry[];

export type WizardDirectories = WizardDirectory[];

export type WizardProcessStateMachine = {
	context: WizardFileContext;
	machine: ReturnType<StateMachineSignature>;
	id: ReturnType<typeof crypto.randomUUID>;
};

export type CompletionResult = Entry[];

/**
 * User metadata that can be used in the DOCX template. All fields are optional and can be null.
 * It can be set in the settings.
 */
export type UserMetadata = {
	fullName?: string | null;
	ausbildungsberuf?: string | null;
	abteilung?: string | null;
};

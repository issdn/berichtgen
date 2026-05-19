import type { Ort } from '$wizard/enums';
import type { DateRangeSchema } from '$wizard/schemas';
import type { StateMachineSignature } from '$wizard/services/state_machine';
import type { WizardFileContext } from '$wizard/services/wizard_file_context';
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

export interface BerichtgenWeightedDateRange {
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
	ranges: BerichtgenWeightedDateRange[];
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
	id: string;
	/** Sets cancelled and advances the machine — call instead of mutating context directly. */
	cancel: () => void;
	/** Clears cancelled and re-enqueues the machine — call instead of mutating context directly. */
	restart: () => void;
	/** Advances the machine when the user has confirmed their date ranges. */
	confirmDateRanges: () => void;
};

export type CompletionResult = Entry[];

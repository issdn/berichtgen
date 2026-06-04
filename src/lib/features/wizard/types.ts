import type { Attributes, ReplaceAttr } from '$core/types';
import type { BerichtgenError } from '$lib/errors';
import type { Ort } from '$wizard/enums';
import type { WizardStep } from '$wizard/enums';
import type {
	completionResultSchema,
	genaiCompletionSchema
} from '$wizard/schemas';
import type { FileRouting } from '$wizard/services/routing';
import type { StateMachineSignature } from '$wizard/services/state_machine';
import type { WizardFileContext } from '$wizard/services/wizard_file_context';
import type { DateValue } from '@internationalized/date';

import * as z from 'zod';

export type GenaiCompletionResult = z.infer<typeof genaiCompletionSchema>;

/**
 * Response from the batch completion endpoint.
 * `results[i]` is `null` when item i was not processed due to an insufficient token budget.
 * `insufficient_tokens` is true when some items were skipped for that reason.
 */
export type BatchCompletionApiResponse = {
	insufficient_tokens: boolean;
	results: GenaiCompletionResult[];
};

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

export type CompletionResult = z.infer<typeof completionResultSchema>;

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

export type TimeSpreadResult = (CompletionResult[number] & {
	ausbildungsjahr: number;
	datum: string;
	endDatum: string;
	stunden: number;
})[];

export type WizardDirectories = WizardDirectory[];

export type WizardDirectory = File[];

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
	sessionId: string;
	updatedAt: number;
};
export type WizardProcessStateMachine = {
	/** Sets cancelled and advances the machine â€” call instead of mutating context directly. */
	cancel: () => void;
	/** Advances the machine when the user has confirmed their date ranges. */
	confirmDateRanges: () => void;
	context: WizardFileContext;
	id: string;
	machine: StateMachineSignature;
	/** Removes the file from the active wizard schedule before AI completion starts. */
	remove: () => void;
	/** Clears cancelled and re-enqueues the machine â€” call instead of mutating context directly. */
	restart: () => void;
};

export type WizardRawDirectories = File[][];

export type WizardRawDirectory = WizardRawDirectories[number];

import type { QualifikationenBetrieb, QualifikationenSchule } from '$src/lib/constants';
import type { Ort } from '$src/lib/enums';
import type { DateRangeSchema } from '$src/lib/schemas';
import { type StateMachineSignature } from '$src/lib/state_machine';
import type { WizardFileContext } from '$src/lib/wizard_file_context.svelte';
import type { DateValue } from '@internationalized/date';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export interface Entry {
	qualifikationen: QualifikationenType[];
	text: string;
	datum?: string;
	ort?: Ort;
	hours?: number;
	anwesenheit: 'ANWESEND';
}

export type ResultEntry = Required<Entry>;

export interface IncuriaWeightedDateRange {
	daterange: {
		start: DateValue;
		end: DateValue;
	};
	hours?: number;
}

export type QualifikationenType =
	| (typeof QualifikationenSchule)[number]
	| (typeof QualifikationenBetrieb)[number];

export type UserContext = () => {
	user: User | null;
	loggedIn: boolean;
	supabase: SupabaseClient;
};

export type CSVConfigFile = {
	ort: Ort;
	file: string;
	ranges: IncuriaWeightedDateRange[];
};

export type CSVConfig = CSVConfigFile[];

export type WizardRawDirectories = File[][];

export type WizardRawDirectory = WizardRawDirectories[number];

export type WizardDirectory = { file: File; config?: DateRangeSchema }[];

export type WizardDirectories = WizardDirectory[];

export type WizardProcessStateMachine = {
	context: WizardFileContext;
	machine: ReturnType<StateMachineSignature>;
	id: ReturnType<typeof crypto.randomUUID>;
};

/**
 * Dropzone component overrides global paste event handler on mount.
 * On unmount, it restores the previous handler.
 * For more see *Dropzone.svelte*, *WizardDropzone.svelte* and *paste_stack.svelte.ts*
 */
export type PasteHandler = ((e: ClipboardEvent) => void)[];

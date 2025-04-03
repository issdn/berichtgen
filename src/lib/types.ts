import type { DateValue } from '@internationalized/date';

export interface Entry {
	qualifikationen: string[];
	text: string;
	datum?: string;
}

export interface IncuriaWeightedDateRange {
	daterange: {
		start: DateValue;
		end: DateValue;
	};
	hours?: number;
}

export enum IncuriaErrorType {
	INVALID_FILE,
	FORMAT_NOT_SUPPORTED,
	DEVELOPERS_FAULT,
	DOCX_FAULTY,
	INVALID_JSON_FROM_AI
}

export class IncuriaError extends Error {
	public type: IncuriaErrorType;

	constructor(type: IncuriaErrorType, message: string) {
		super(message);
		this.type = type;
	}
}

export enum WizardStep {
	INITIALISING = 'init',
	PROCESSING = 'process',
	AI_COMPLETION = 'completion',
	TIME_SPREADING = 'time_spread',
	DONE = 'done',
	CANCELLED = 'cancelled',
	ERROR = 'error',
	WAITING = 'waiting'
}

import type { DateRange } from 'bits-ui';

export interface Entry {
	qualifikationen: string[];
	text: string;
	datum?: string;
}

export interface IncuriaWeightedDateRange {
	startDate: string;
	endDate: string;
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
	INITIALISING,
	PROCESSING,
	AI_COMPLETION,
	TIME_SPREADING,
	DONE,
	ERROR
}

type RemoveUndefined<T> = {
	[K in keyof T]: Exclude<T[K], undefined>;
};

export type IncuriaDateRange = Pick<RemoveUndefined<DateRange>, 'end'> & Pick<DateRange, 'start'>;

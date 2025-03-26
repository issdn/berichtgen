import type { Dayjs } from 'dayjs';

export interface Entry {
	qualifikationen: string[];
	text: string;
	datum?: string;
}

export interface DateRange {
	startDate: string | Date | Dayjs;
	endDate: string | Date | Dayjs;
	hours?: number;
}

export enum IncuriaErrorType {
	INVALID_FILE,
	FORMAT_NOT_SUPPORTED,
	DEVELOPERS_FAULT,
	DOCX_FAULTY
}

export class IncuriaError extends Error {
	public type: IncuriaErrorType;

	constructor(type: IncuriaErrorType, message: string) {
		super(message);
		this.type = type;
	}
}

export enum WizardStep {
	PROCESSING,
	AI_COMPLETION,
	TIME_SPREADING,
	DONE,
	ERROR
}

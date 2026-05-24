export const Ort = Object.freeze({
	BETRIEB: 'BETRIEB',
	SCHULE: 'SCHULE',
	'SCHULE/BETRIEB': 'SCHULE/BETRIEB',
	UNTERWEISUNG: 'UNTERWEISUNG'
} as const);

export type Ort = (typeof Ort)[keyof typeof Ort];

export const WizardStep = Object.freeze({
	/** Batch is actively being sent to the AI completion API. */
	AI_COMPLETION: 'completion',
	/** File has been parsed and configured — waiting for the scheduler to group all files. */
	BATCH_PENDING: 'batch_pending',
	CANCELLED: 'cancelled',
	DONE: 'done',
	ERROR: 'error',
	INITIALISING: 'init',
	PROCESSING: 'process',
	TIME_SPREADING: 'time_spread',
	WAITING: 'waiting'
} as const);

export type WizardStep = (typeof WizardStep)[keyof typeof WizardStep];

export const FileTypes = Object.freeze({
	CSV: 'text/csv',
	DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	JPG: 'image/jpeg',
	JSON: 'application/json',
	PDF: 'application/pdf',
	PNG: 'image/png',
	TXT: 'text/plain',
	/**
	 * Synthetic MIME type used by Dropzone URL paste/drag transport.
	 * This is not a real uploaded document format.
	 */
	URI_LIST: 'text/uri-list'
} as const);

export type FileTypes = (typeof FileTypes)[keyof typeof FileTypes];

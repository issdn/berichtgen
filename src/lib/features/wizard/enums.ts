export const Ort = Object.freeze({
	SCHULE: 'SCHULE',
	BETRIEB: 'BETRIEB',
	UNTERWEISUNG: 'UNTERWEISUNG',
	'SCHULE/BETRIEB': 'SCHULE/BETRIEB'
} as const);

export type Ort = (typeof Ort)[keyof typeof Ort];

export const WizardStep = Object.freeze({
	INITIALISING: 'init',
	PROCESSING: 'process',
	/** File has been parsed and configured — waiting for the scheduler to group all files. */
	BATCH_PENDING: 'batch_pending',
	/** Batch is actively being sent to the AI completion API. */
	AI_COMPLETION: 'completion',
	TIME_SPREADING: 'time_spread',
	DONE: 'done',
	CANCELLED: 'cancelled',
	ERROR: 'error',
	WAITING: 'waiting'
} as const);

export type WizardStep = (typeof WizardStep)[keyof typeof WizardStep];

export const FileTypes = Object.freeze({
	DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	PDF: 'application/pdf',
	JSON: 'application/json',
	TXT: 'text/plain',
	CSV: 'text/csv',
	JPG: 'image/jpeg',
	PNG: 'image/png',
	/**
	 * Synthetic MIME type used by Dropzone URL paste/drag transport.
	 * This is not a real uploaded document format.
	 */
	URI_LIST: 'text/uri-list'
} as const);

export type FileTypes = (typeof FileTypes)[keyof typeof FileTypes];

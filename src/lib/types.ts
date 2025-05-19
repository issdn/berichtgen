import type { DateValue } from '@internationalized/date';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export enum Ort {
	SCHULE = 'SCHULE',
	BETRIEB = 'BETRIEB',
	UNTERWEISUNG = 'UNTERWEISUNG',
	'SCHULE/BETRIEB' = 'SCHULE/BETRIEB'
}

export interface Entry {
	qualifikationen: QualifikationenType[];
	text: string;
	datum?: string;
	ort?: Ort;
	hours?: number;
}

export type ResultEntry = Required<Entry>;

export interface IncuriaWeightedDateRange {
	daterange: {
		start: DateValue;
		end: DateValue;
	};
	hours?: number;
}

export enum CommonServerErrorTypes {
	DATABASE_ERROR = 'DATABASE_ERROR',
	UNAUTHORIZED = 'UNAUTHORIZED',
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	STRIPE_ERROR = 'STRIPE_ERROR'
}

export enum IncuriaErrorType {
	INVALID_FILE,
	FORMAT_NOT_SUPPORTED,
	COMPLETION_FAILED,
	PARSE_FAILED,
	SPREAD_FAILED,
	DEVELOPERS_FAULT,
	DOCX_FAULTY,
	INVALID_JSON_FROM_AI
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

export enum OpenaAIErrorCode {
	BadRequestError = 400,
	AuthenticationError = 401,
	PermissionDeniedError = 403,
	NotFoundError = 404,
	UnprocessableEntityError = 422,
	RateLimitError = 429,
	InternalServerError = 500
}

export enum GenAIErrorCode {
	// The request body is malformed. There is a typo, or a missing required field in your request.
	// Check the API reference for request format, examples, and supported versions. Using features from a newer API version with an older endpoint can cause errors.
	INVALID_ARGUMENT = 400,

	// Gemini API free tier is not available in your country. Please enable billing on your project in Google AI Studio.
	// You are making a request in a region where the free tier is not supported, and you have not enabled billing on your project in Google AI Studio.
	// To use the Gemini API, you will need to setup a paid plan using Google AI Studio.
	// FAILED_PRECONDITION = 400,

	// Your API key doesn't have the required permissions.
	// You are using the wrong API key; you are trying to use a tuned model without going through proper authentication.
	// Check that your API key is set and has the right access. And make sure to go through proper authentication to use tuned models.
	PERMISSION_DENIED = 403,

	// The requested resource wasn't found.
	// An image, audio, or video file referenced in your request was not found.
	// Check if all parameters in your request are valid for your API version.
	NOT_FOUND = 404,

	// You've exceeded the rate limit.
	// You are sending too many requests per minute with the free tier Gemini API.
	// Ensure you're within the model's rate limit. Request a quota increase if needed.
	RESOURCE_EXHAUSTED = 429,

	// An unexpected error occurred on Google's side.
	// Your input context is too long.
	// Reduce your input context or temporarily switch to another model (e.g. from Gemini 1.5 Pro to Gemini 1.5 Flash) and see if it works.
	// Or wait a bit and retry your request. If the issue persists after retrying, please report it using the Send feedback button in Google AI Studio.
	INTERNAL = 500,

	// The service may be temporarily overloaded or down.
	// The service is temporarily running out of capacity.
	// Temporarily switch to another model (e.g. from Gemini 1.5 Pro to Gemini 1.5 Flash) and see if it works.
	// Or wait a bit and retry your request. If the issue persists after retrying, please report it using the Send feedback button in Google AI Studio.
	UNAVAILABLE = 503,

	// The service is unable to finish processing within the deadline.
	// Your prompt (or context) is too large to be processed in time.
	// Set a larger 'timeout' in your client request to avoid this error.
	DEADLINE_EXCEEDED = 504
}

export enum CompletionExceptionType {
	INVALID_TOKEN = 400,
	NOT_ENOUGH_TOKENS = 402,
	TOKEN_EXPIRED = 403,
	UNKNOWN_THIRD_PARTY_ERROR = 404,
	TOO_MANY_REQUESTS = 429,
	INTERNAL = 500
}

export const QualifikationenSchule = [
	'Allgemeinbildende Fächer',
	'Arbeitsplätze nach Kundenwunsch ausstatten',
	'Benutzerschnittstellen gestalten und entwickeln',
	'Clients in Netzwerke einbinden',
	'Cyber-physische Systeme ergänzen',
	'Das Unternehmen und die eigene Rolle im Betrieb beschreiben',
	'Daten systemübergreifend bereitstellen',
	'Funktionalität in Anwendungen realisieren',
	'Kundenspezifische Anwendungsentwicklung durchführen',
	'Netzwerke und Dienste bereitstellen',
	'Schutzbedarfsanalyse im eigenen Arbeitsbereich durchführen',
	'Serviceanfragen bearbeiten',
	'Software zur Verwaltung von Daten anpassen'
] as const;

export const QualifikationenBetrieb = [
	'Aufbau und Organisation des Ausbildungsbetriebes',
	'Berufsbildung sowie Arbeits- und Tarifrecht',
	'Betreiben von IT-Systemen',
	'Beurteilen marktgängiger IT-Systeme und kundenspezifischer Lösungen',
	'Durchführen und Dokumentieren von qualitätssichernden Maßnahmen',
	'Entwickeln, Erstellen und Betreuen von IT-Lösungen',
	'Erbringen der Leistungen und Auftragsabschluss',
	'Inbetriebnehmen von Speicherlösungen',
	'Informieren und Beraten von Kunden und Kundinnen',
	'Konzipieren und Umsetzen von kundenspezifischen Softwareanwendungen',
	'Planen, Vorbereiten und Durchführen von Arbeitsaufgaben in Abstimmung mit den kundenspezifischen Geschäfts- und Leistungsprozessen',
	'Programmieren von Softwarelösungen',
	'Sicherheit und Gesundheitsschutz bei der Arbeit',
	'Sicherstellen der Qualität von Softwareanwendungen',
	'Sonstige Qualifikation',
	'Umsetzen, Integrieren und Prüfen von Maßnahmen zur IT-Sicherheit und zum Datenschutz',
	'Umweltschutz',
	'Vernetztes Zusammenarbeiten unter Nutzung digitaler Medien'
] as const;

export type QualifikationenType =
	| (typeof QualifikationenSchule)[number]
	| (typeof QualifikationenBetrieb)[number];

export enum PaymentStatus {
	SUCCESS = 'success',
	FAILED = 'failed'
}

export enum FileTypes {
	DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	PDF = 'application/pdf',
	JSON = 'application/json',
	TXT = 'text/plain',
	CSV = 'text/csv',
	JPG = 'image/jpeg',
	PNG = 'image/png'
}

export type UserContext = () => {
	user: User | null;
	loggedIn: boolean;
	supabase: SupabaseClient;
};

export enum KaufOperation {
	UPDATE = 'update',
	CREATE = 'create'
}

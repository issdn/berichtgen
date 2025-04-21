import type { DateValue } from '@internationalized/date';

export interface Entry {
	qualifikationen: string[];
	text: string;
	datum?: string;
	ort?: string;
}

export type ResultEntry = Required<Entry>;

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
	TOKEN_EXPIRED = 403,
	UNKNOWN_THIRD_PARTY_ERROR = 404,
	TOO_MANY_REQUESTS = 429,
	INTERNAL = 500
}

export enum QualifikationenSchule {
	'Allgemeinbildende Fächer' = 49,
	'Arbeitsplätze nach Kundenwunsch ausstatten' = 29,
	'Benutzerschnittstellen gestalten und entwickeln' = 37,
	'Clients in Netzwerke einbinden' = 30,
	'Cyber-physische Systeme ergänzen' = 34,
	'Das Unternehmen und die eigene Rolle im Betrieb beschreiben' = 28,
	'Daten systemübergreifend bereitstellen' = 35,
	'Funktionalität in Anwendungen realisieren' = 38,
	'Kundenspezifische Anwendungsentwicklung durchführen' = 39,
	'Netzwerke und Dienste bereitstellen' = 36,
	'Schutzbedarfsanalyse im eigenen Arbeitsbereich durchführen' = 31,
	'Serviceanfragen bearbeiten' = 33,
	'Software zur Verwaltung von Daten anpassen' = 32,
	'Aufbau und Organisation des Ausbildungsbetriebes' = 24,
	'Berufsbildung sowie Arbeits- und Tarifrecht' = 23,
	'Betreiben von IT-Systemen' = 8,
	'Beurteilen marktgängiger IT-Systeme und kundenspezifischer Lösungen' = 3,
	'Durchführen und Dokumentieren von qualitätssichernden Maßnahmen' = 5,
	'Entwickeln, Erstellen und Betreuen von IT-Lösungen' = 4,
	'Erbringen der Leistungen und Auftragsabschluss' = 7,
	'Inbetriebnehmen von Speicherlösungen' = 9,
	'Informieren und Beraten von Kunden und Kundinnen' = 2,
	'Konzipieren und Umsetzen von kundenspezifischen Softwareanwendungen' = 11,
	'Planen, Vorbereiten und Durchführen von Arbeitsaufgaben in Abstimmung mit den kundenspezifischen Geschäfts- und Leistungsprozessen' = 1,
	'Programmieren von Softwarelösungen' = 10,
	'Sicherheit und Gesundheitsschutz bei der Arbeit' = 25,
	'Sicherstellen der Qualität von Softwareanwendungen' = 12,
	'Sonstige Qualifikation' = 50,
	'Umsetzen, Integrieren und Prüfen von Maßnahmen zur IT-Sicherheit und zum Datenschutz' = 6,
	'Umweltschutz' = 26,
	'Vernetztes Zusammenarbeiten unter Nutzung digitaler Medien' = 27
}

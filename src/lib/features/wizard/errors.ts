import { BerichtgenError, buildError, type UnionOf } from '$lib/errors';

export const EFileRoutingError = buildError({
	FILE_READ_FAILED: {
		httpCode: 400,
		message: 'Datei konnte nicht gelesen werden.'
	},
	FILE_TOO_LARGE: {
		httpCode: 413,
		message: 'Datei ist größer als 50 MB.'
	},
	FORMAT_NOT_SUPPORTED: {
		httpCode: 400,
		message: 'Dateiformat wird nicht unterstützt.'
	},
	GCS_UPLOAD_FAILED: { httpCode: 500, message: 'Datei-Upload fehlgeschlagen.' },
	GCS_UPLOAD_URL_FAILED: {
		httpCode: 500,
		message: 'Upload-URL konnte nicht erstellt werden.'
	}
} as const);

export const EWizardError = buildError({
	COMPLETION_FAILED: {
		httpCode: 500,
		message: 'Vervollständigung fehlgeschlagen.'
	},
	INVALID_JSON_FROM_AI: {
		httpCode: 500,
		message: 'Ungültige JSON-Antwort von der KI.'
	},
	SPREAD_FAILED: { httpCode: 500, message: 'Zeitverteilung fehlgeschlagen.' }
} as const);

export const ECompletionException = buildError({
	INTERNAL: { httpCode: 500, message: 'Interner Serverfehler.' },
	NOT_ENOUGH_TOKENS: { httpCode: 402, message: 'Nicht genug Tokens.' },
	TOO_MANY_REQUESTS: { httpCode: 429, message: 'Zu viele Anfragen.' },
	UNKNOWN_THIRD_PARTY_ERROR: {
		httpCode: 404,
		message: 'Ein unbekannter Fehler beim LLM-Anbieter ist aufgetreten.'
	}
} as const);

export const EGenAIError = buildError({
	DEADLINE_EXCEEDED: { httpCode: 504, message: 'Zeitlimit überschritten.' },
	INTERNAL: { httpCode: 500, message: 'Interner Serverfehler.' },
	INVALID_ARGUMENT: { httpCode: 400, message: 'Ungültiges Argument.' },
	NOT_FOUND: { httpCode: 404, message: 'Nicht gefunden.' },
	PERMISSION_DENIED: { httpCode: 403, message: 'Zugriff verweigert.' },
	RESOURCE_EXHAUSTED: { httpCode: 429, message: 'Ratenlimit überschritten.' },
	UNAVAILABLE: { httpCode: 503, message: 'Dienst nicht verfügbar.' }
} as const);

export const ETemplateError = buildError({
	ALREADY_REPORTED: {
		httpCode: 409,
		message: 'Du hast dieses Template bereits gemeldet.'
	},
	CANNOT_REPORT_OWN: {
		httpCode: 403,
		message: 'Du kannst dein eigenes Template nicht melden.'
	},
	TEMPLATE_NOT_FOUND: { httpCode: 404, message: 'Template nicht gefunden.' },
	TEMPLATE_SAFE: {
		httpCode: 403,
		message: 'Dieses Template wurde als sicher markiert.'
	}
} as const);

export const EGCSError = buildError({
	BAD_REQUEST: {
		cause: 'badRequest',
		httpCode: 400,
		message: 'Ungültige Anfrage. Bitte überprüfen Sie die Syntax.'
	},
	CONFLICT: {
		cause: 'conflict',
		httpCode: 409,
		message: 'Konflikt bei der Bearbeitung der Anfrage.'
	},
	FORBIDDEN: {
		cause: 'forbidden',
		httpCode: 403,
		message: 'Zugriff verweigert. Unzureichende Berechtigungen.'
	},
	GATEWAY_TIMEOUT: {
		cause: 'gatewayTimeout',
		httpCode: 504,
		message: 'Zeitüberschreitung beim Gateway.'
	},
	GONE: {
		cause: 'gone',
		httpCode: 410,
		message: 'Ressource ist dauerhaft nicht mehr verfügbar.'
	},
	INTERNAL_SERVER_ERROR: {
		cause: 'internalError',
		httpCode: 500,
		message: 'Interner Serverfehler.'
	},
	METHOD_NOT_ALLOWED: {
		cause: 'methodNotAllowed',
		httpCode: 405,
		message: 'Diese HTTP-Methode ist für diese Ressource nicht erlaubt.'
	},
	NOT_FOUND: {
		cause: 'notFound',
		httpCode: 404,
		message: 'Die angeforderte Ressource wurde nicht gefunden.'
	},
	PAYLOAD_TOO_LARGE: {
		cause: 'uploadTooLarge',
		httpCode: 413,
		message: 'Anfrage-Datenmenge ist zu groß.'
	},
	PRECONDITION_FAILED: {
		cause: 'conditionNotMet',
		httpCode: 412,
		message: 'Vorbedingung der Anfrage nicht erfüllt.'
	},
	REQUESTED_RANGE_NOT_SATISFIABLE: {
		cause: 'requestedRangeNotSatisfiable',
		httpCode: 416,
		message: 'Angeforderter Bereich nicht erfüllbar.'
	},
	SERVICE_UNAVAILABLE: {
		cause: 'backendError',
		httpCode: 503,
		message: 'Dienst vorübergehend nicht verfügbar.'
	},
	TOO_MANY_REQUESTS: {
		cause: 'rateLimitExceeded',
		httpCode: 429,
		message: 'Zu viele Anfragen in kurzer Zeit. Bitte warten.'
	},
	UNAUTHORIZED: {
		cause: 'unauthorized',
		httpCode: 401,
		message: 'Authentifizierung erforderlich.'
	}
} as const);

type WizardErrorValue = UnionOf<
	[
		typeof EWizardError,
		typeof ECompletionException,
		typeof EGenAIError,
		typeof ETemplateError,
		typeof EFileRoutingError,
		typeof EGCSError
	]
>;

export class WizardError extends BerichtgenError {
	declare readonly apiError: WizardErrorValue;

	constructor(apiError: WizardErrorValue) {
		super(apiError);
	}

	static fromCode(code: string): WizardError {
		const match = (
			[
				...Object.values(EWizardError),
				...Object.values(ECompletionException),
				...Object.values(EGenAIError),
				...Object.values(ETemplateError),
				...Object.values(EFileRoutingError),
				...Object.values(EGCSError)
			] as WizardErrorValue[]
		).find((e) => e.code === code);
		return new WizardError(match ?? EWizardError.COMPLETION_FAILED);
	}
}

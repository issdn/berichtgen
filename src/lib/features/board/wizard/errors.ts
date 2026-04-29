import { BerichtgenError, buildError, type UnionOf } from '$lib/errors';

export const EFileRoutingError = buildError({
	FILE_READ_FAILED: {
		httpCode: 400,
		message: 'Datei konnte nicht gelesen werden.'
	},
	GCS_UPLOAD_URL_FAILED: {
		httpCode: 500,
		message: 'Upload-URL konnte nicht erstellt werden.'
	},
	GCS_UPLOAD_FAILED: { httpCode: 500, message: 'Datei-Upload fehlgeschlagen.' },
	FORMAT_NOT_SUPPORTED: {
		httpCode: 400,
		message: 'Dateiformat wird nicht unterstützt.'
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
	NOT_ENOUGH_TOKENS: { httpCode: 402, message: 'Nicht genug Tokens.' },
	UNKNOWN_THIRD_PARTY_ERROR: {
		httpCode: 404,
		message: 'Ein unbekannter Fehler beim LLM-Anbieter ist aufgetreten.'
	},
	TOO_MANY_REQUESTS: { httpCode: 429, message: 'Zu viele Anfragen.' },
	INTERNAL: { httpCode: 500, message: 'Interner Serverfehler.' }
} as const);

export const EGenAIError = buildError({
	INVALID_ARGUMENT: { httpCode: 400, message: 'Ungültiges Argument.' },
	PERMISSION_DENIED: { httpCode: 403, message: 'Zugriff verweigert.' },
	NOT_FOUND: { httpCode: 404, message: 'Nicht gefunden.' },
	RESOURCE_EXHAUSTED: { httpCode: 429, message: 'Ratenlimit überschritten.' },
	INTERNAL: { httpCode: 500, message: 'Interner Serverfehler.' },
	UNAVAILABLE: { httpCode: 503, message: 'Dienst nicht verfügbar.' },
	DEADLINE_EXCEEDED: { httpCode: 504, message: 'Zeitlimit überschritten.' }
} as const);

export const ETemplateError = buildError({
	TEMPLATE_NOT_FOUND: { httpCode: 404, message: 'Template nicht gefunden.' },
	ALREADY_REPORTED: {
		httpCode: 409,
		message: 'Du hast dieses Template bereits gemeldet.'
	},
	CANNOT_REPORT_OWN: {
		httpCode: 403,
		message: 'Du kannst dein eigenes Template nicht melden.'
	},
	TEMPLATE_SAFE: {
		httpCode: 403,
		message: 'Dieses Template wurde als sicher markiert.'
	}
} as const);

export const EGCSError = buildError({
	BAD_REQUEST: {
		httpCode: 400,
		message: 'Ungültige Anfrage. Bitte überprüfen Sie die Syntax.',
		cause: 'badRequest'
	},
	UNAUTHORIZED: {
		httpCode: 401,
		message: 'Authentifizierung erforderlich.',
		cause: 'unauthorized'
	},
	FORBIDDEN: {
		httpCode: 403,
		message: 'Zugriff verweigert. Unzureichende Berechtigungen.',
		cause: 'forbidden'
	},
	NOT_FOUND: {
		httpCode: 404,
		message: 'Die angeforderte Ressource wurde nicht gefunden.',
		cause: 'notFound'
	},
	METHOD_NOT_ALLOWED: {
		httpCode: 405,
		message: 'Diese HTTP-Methode ist für diese Ressource nicht erlaubt.',
		cause: 'methodNotAllowed'
	},
	CONFLICT: {
		httpCode: 409,
		message: 'Konflikt bei der Bearbeitung der Anfrage.',
		cause: 'conflict'
	},
	GONE: {
		httpCode: 410,
		message: 'Ressource ist dauerhaft nicht mehr verfügbar.',
		cause: 'gone'
	},
	PRECONDITION_FAILED: {
		httpCode: 412,
		message: 'Vorbedingung der Anfrage nicht erfüllt.',
		cause: 'conditionNotMet'
	},
	PAYLOAD_TOO_LARGE: {
		httpCode: 413,
		message: 'Anfrage-Datenmenge ist zu groß.',
		cause: 'uploadTooLarge'
	},
	REQUESTED_RANGE_NOT_SATISFIABLE: {
		httpCode: 416,
		message: 'Angeforderter Bereich nicht erfüllbar.',
		cause: 'requestedRangeNotSatisfiable'
	},
	TOO_MANY_REQUESTS: {
		httpCode: 429,
		message: 'Zu viele Anfragen in kurzer Zeit. Bitte warten.',
		cause: 'rateLimitExceeded'
	},
	INTERNAL_SERVER_ERROR: {
		httpCode: 500,
		message: 'Interner Serverfehler.',
		cause: 'internalError'
	},
	SERVICE_UNAVAILABLE: {
		httpCode: 503,
		message: 'Dienst vorübergehend nicht verfügbar.',
		cause: 'backendError'
	},
	GATEWAY_TIMEOUT: {
		httpCode: 504,
		message: 'Zeitüberschreitung beim Gateway.',
		cause: 'gatewayTimeout'
	}
} as const);

type WizardErrorValue = UnionOf<[
	typeof EWizardError,
	typeof ECompletionException,
	typeof EGenAIError,
	typeof ETemplateError,
	typeof EFileRoutingError,
	typeof EGCSError
]>;

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

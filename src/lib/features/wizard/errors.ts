import { buildError } from '$lib/errors';

export const EFileRoutingError = buildError('wizard.routing', {
	FILE_CORRUPTED: {
		httpCode: 400,
		message: 'Die Datei scheint beschädigt zu sein.'
	},
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
	},
	INLINE_TXT_TOO_LARGE: {
		httpCode: 413,
		message: 'TXT-Datei ist größer als 2 MB.'
	}
} as const);

export const EWizardError = buildError('wizard.runtime', {
	COMPLETION_FAILED: {
		httpCode: 500,
		message: 'Vervollständigung fehlgeschlagen.'
	},
	INVALID_JSON_FROM_AI: {
		httpCode: 500,
		message: 'Ungültige JSON-Antwort von der KI.'
	},
	REHYDRATION_FAILED: {
		httpCode: 500,
		message: 'Datenwiederherstellung fehlgeschlagen.'
	},
	SPREAD_FAILED: { httpCode: 500, message: 'Zeitverteilung fehlgeschlagen.' }
} as const);

export const ECompletionException = buildError('wizard.completion', {
	INTERNAL: { httpCode: 500, message: 'Interner Serverfehler.' },
	NOT_ENOUGH_TOKENS: { httpCode: 402, message: 'Nicht genug Tokens.' },
	TOO_MANY_REQUESTS: { httpCode: 429, message: 'Zu viele Anfragen.' },
	UNKNOWN_THIRD_PARTY_ERROR: {
		httpCode: 404,
		message: 'Ein unbekannter Fehler beim LLM-Anbieter ist aufgetreten.'
	}
} as const);

export const EGenAIError = buildError('wizard.genai', {
	CONFLICT: {
		httpCode: 409,
		message: 'Konflikt mit bestehender Ressource.'
	},
	DEADLINE_EXCEEDED: {
		httpCode: 504,
		message: 'Zeitlimit überschritten.'
	},
	FAILED_PRECONDITION: {
		httpCode: 412,
		message: 'Voraussetzungen nicht erfüllt.'
	},
	INTERNAL: {
		httpCode: 500,
		message: 'Interner Serverfehler.'
	},
	INVALID_ARGUMENT: {
		httpCode: 400,
		message: 'Ungültige Anfrage.'
	},
	NOT_FOUND: {
		httpCode: 404,
		message: 'Ressource nicht gefunden.'
	},
	PERMISSION_DENIED: {
		httpCode: 403,
		message: 'Zugriff verweigert.'
	},
	RESOURCE_EXHAUSTED: {
		httpCode: 429,
		message: 'Limit überschritten.'
	},
	UNAUTHENTICATED: {
		httpCode: 401,
		message: 'Authentifizierung fehlgeschlagen.'
	},
	UNAVAILABLE: {
		httpCode: 503,
		message: 'Dienst nicht verfügbar.'
	}
} as const);

export const ETemplateError = buildError('templates', {
	ALREADY_REPORTED: {
		httpCode: 409,
		message: 'Du hast diese Vorlage bereits gemeldet.'
	},
	CANNOT_REPORT_OWN: {
		httpCode: 403,
		message: 'Du kannst deine eigene Vorlage nicht melden.'
	},
	MAX_TEMPLATES_REACHED: {
		httpCode: 409,
		message: 'Du kannst maximal 3 Vorlagen hochladen.'
	},
	TEMPLATE_NOT_FOUND: { httpCode: 404, message: 'Vorlage nicht gefunden.' },
	TEMPLATE_SAFE: {
		httpCode: 403,
		message: 'Diese Vorlage wurde als sicher markiert.'
	}
} as const);

export const EGCSError = buildError('wizard.gcs', {
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

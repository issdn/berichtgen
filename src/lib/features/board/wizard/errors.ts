import { ***REMOVED***Error, buildError } from '$lib/errors';

export const EWizardError = buildError({
	COMPLETION_FAILED: { httpCode: 500, message: 'Vervollständigung fehlgeschlagen.' },
	INVALID_JSON_FROM_AI: { httpCode: 500, message: 'Ungültige JSON-Antwort von der KI.' },
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
	ALREADY_REPORTED: { httpCode: 409, message: 'Du hast dieses Template bereits gemeldet.' },
	CANNOT_REPORT_OWN: { httpCode: 403, message: 'Du kannst dein eigenes Template nicht melden.' },
	TEMPLATE_SAFE: { httpCode: 403, message: 'Dieses Template wurde als sicher markiert.' }
} as const);

type WizardErrorValue =
	| (typeof EWizardError)[keyof typeof EWizardError]
	| (typeof ECompletionException)[keyof typeof ECompletionException]
	| (typeof EGenAIError)[keyof typeof EGenAIError]
	| (typeof ETemplateError)[keyof typeof ETemplateError];

export class WizardError extends ***REMOVED***Error {
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
				...Object.values(ETemplateError)
			] as WizardErrorValue[]
		).find((e) => e.code === code);
		return new WizardError(match ?? EWizardError.COMPLETION_FAILED);
	}
}

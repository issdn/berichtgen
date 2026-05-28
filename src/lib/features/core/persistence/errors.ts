import { buildError } from '$lib/errors';

/** Persistence errors for client-side storage mutations. */
export const EPersistenceError = buildError('core.persistence', {
	CLEAR_FAILED: {
		cause: 'Der gespeicherte Sitzungszustand konnte nicht entfernt werden.',
		httpCode: 500,
		message: 'Persistenz-Löschen fehlgeschlagen.'
	},
	SAVE_FAILED: {
		cause: 'Der Sitzungszustand konnte nicht lokal gespeichert werden.',
		httpCode: 500,
		message: 'Persistenz-Speichern fehlgeschlagen.'
	}
} as const);

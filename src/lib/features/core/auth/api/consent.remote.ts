import { getRequestEvent } from '$app/server';
import {
	VERTEX_AI_CONSENT_SOURCE_SETTINGS,
	VERTEX_AI_CONSENT_SOURCE_WIZARD,
	VERTEX_AI_CONSENT_TYPE
} from '$lib/constants';
import { ECommonServerError } from '$lib/errors';
import { guardedCommand } from '$lib/server/remote';
import { svelteApiError } from '$server/errors';
import { withRateLimit } from '$server/rate_limit';
import { z } from 'zod';

import { appendConsentLog } from './consent.handlers';

const appendConsentLogSchema = z.object({
	appVersion: z.string().min(1),
	consentType: z.literal(VERTEX_AI_CONSENT_TYPE),
	source: z.enum([
		VERTEX_AI_CONSENT_SOURCE_SETTINGS,
		VERTEX_AI_CONSENT_SOURCE_WIZARD
	]),
	status: z.enum(['granted', 'withdrawn'])
});

export const appendConsentLogCommand = guardedCommand(
	appendConsentLogSchema,
	async ({ appVersion, consentType, source, status }) =>
		withRateLimit({
			policyId: 'append-consent-log',
			fn: async () => {
				const user = getRequestEvent().locals.user!;
				if (!user.email) {
					throw svelteApiError({
						...ECommonServerError.UNAUTHORIZED,
						cause: 'Für die Einwilligung ist eine E-Mail-Adresse erforderlich.'
					});
				}

				const result = await appendConsentLog({
					appVersion,
					consentType,
					source,
					status,
					userEmail: user.email,
					userId: user.id
				});
				if (!result.ok) {
					throw svelteApiError(result.error.apiError);
				}
			}
		})
);

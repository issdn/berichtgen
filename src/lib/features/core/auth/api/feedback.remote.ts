import { getRequestEvent } from '$app/server';
import { guardedCommand } from '$lib/server/remote';
import { withRateLimit } from '$server/rate_limit';
import * as z from 'zod';

import { submitFeedback } from './feedback.handlers';

export const submitUserFeedback = guardedCommand(
	z.object({
		message: z.string().trim().min(1).max(1000)
	}),
	async ({ message }) =>
		withRateLimit({
			policyId: 'submit-feedback',
			fn: async () =>
				submitFeedback({ message }, getRequestEvent().locals.user?.id)
		})
);

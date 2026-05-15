import { getRequestEvent } from '$app/server';
import { guardedCommand } from '$lib/server/remote';
import { submitFeedback } from './handlers/feedback';
import * as z from 'zod';

export const submitUserFeedback = guardedCommand(
	z.object({
		message: z.string().trim().min(1).max(1000)
	}),
	async ({ message }) => {
		const {
			locals: { user }
		} = getRequestEvent();
		return submitFeedback({ message }, user?.id);
	}
);


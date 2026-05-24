import { ECommonServerError, svelteApiError } from '$lib/errors';
import { BerichtgenError } from '$lib/errors';
import { tryResultAsync } from '$lib/result';
import db from '$lib/server/db';

export async function submitFeedback(
	{ message }: { message: string },
	userId: string | undefined
): Promise<void> {
	if (!userId) throw svelteApiError(ECommonServerError.UNAUTHORIZED);

	const insertResult = await tryResultAsync(
		db
			.insertInto('user_feedback')
			.values({
				message,
				user_id: userId!
			})
			.execute(),
		BerichtgenError,
		ECommonServerError.DATABASE_ERROR
	);

	if (!insertResult.ok) {
		throw svelteApiError(ECommonServerError.DATABASE_ERROR);
	}
}

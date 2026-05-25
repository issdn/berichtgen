import { ECommonServerError } from '$lib/errors';
import { tryResultAsync } from '$lib/result';
import db from '$lib/server/db';
import { svelteApiError } from '$server/errors';

export async function submitFeedback(
	{ message }: { message: string },
	userId: string | undefined
): Promise<void> {
	if (!userId) throw svelteApiError(ECommonServerError.UNAUTHORIZED);

	const insertResult = await tryResultAsync({
		apiError: ECommonServerError.DATABASE_ERROR,
		promise: db
			.insertInto('user_feedback')
			.values({
				message,
				user_id: userId!
			})
			.execute()
	});

	if (!insertResult.ok) {
		throw svelteApiError(ECommonServerError.DATABASE_ERROR);
	}
}

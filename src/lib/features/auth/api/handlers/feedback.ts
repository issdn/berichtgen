import { ECommonServerError, throwSvelteError } from '$lib/errors';
import db from '$lib/server/db';
import { tryResultAsync } from '$lib/result';
import { BerichtgenError } from '$lib/errors';

export async function submitFeedback(
	{ message }: { message: string },
	userId: string | undefined
): Promise<void> {
	if (!userId) throwSvelteError(ECommonServerError.UNAUTHORIZED);

	const insertResult = await tryResultAsync(
		db
			.insertInto('user_feedback')
			.values({
				user_id: userId!,
				message
			})
			.execute(),
		BerichtgenError,
		ECommonServerError.DATABASE_ERROR
	);

	if (!insertResult.ok) {
		throwSvelteError(ECommonServerError.DATABASE_ERROR);
	}
}

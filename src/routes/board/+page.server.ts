import { db } from '$src/lib/server/db/index.js';
import { usersTokens } from '$src/lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const load = async ({ locals: { user } }) => {
	let tokenCount = await db
		.select({ count: usersTokens.tokens })
		.from(usersTokens)
		.where(eq(usersTokens.userId, user!.id));

	if (tokenCount.length === 0) {
		tokenCount = await db
			.insert(usersTokens)
			.values({ userId: user!.id, tokens: 0 })
			.returning({ count: usersTokens.tokens });
	}

	return {
		tokenCount: tokenCount[0].count
	};
};

import { db } from '$src/lib/server/db/index.js';
import { usersTokens } from '$src/lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const load = async ({ parent }) => {
	const { userId } = await parent();

	let tokenCount = await db
		.select({ count: usersTokens.tokens })
		.from(usersTokens)
		.where(eq(usersTokens.userId, userId));

	if (tokenCount.length === 0) {
		tokenCount = await db
			.insert(usersTokens)
			.values({ userId, tokens: 0 })
			.returning({ count: usersTokens.tokens });
	}

	return {
		tokenCount: tokenCount[0].count
	};
};

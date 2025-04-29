import { db } from '$lib/server/db';
import { llmProviders, usersLLMProviders } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

function hideToken(
	str: string,
	visibleStart: number = 4,
	visibleEnd: number = 2,
	maskChar: string = '*'
): string {
	if (str.length <= visibleStart + visibleEnd) {
		return str;
	}

	const maskedLength = str.length - visibleStart - visibleEnd;
	const maskedPart = maskChar.repeat(maskedLength);

	return str.slice(0, visibleStart) + maskedPart + str.slice(str.length - visibleEnd);
}

export const load = async ({ locals: { user } }) => {
	const providers = await db
		.select({
			id: llmProviders.id,
			name: llmProviders.name,
			price: llmProviders.price,
			token: usersLLMProviders.token,
			owner: llmProviders.owner
		})
		.from(llmProviders)
		.leftJoin(
			usersLLMProviders,
			and(
				eq(usersLLMProviders.userId, user!.id!),
				eq(usersLLMProviders.providerId, llmProviders.id)
			)
		);

	const providersHiddenTokens = providers.map((provider) => {
		if (provider.token != null) {
			provider.token = hideToken(provider.token);
		}
		return provider;
	});

	return {
		providers: providersHiddenTokens
	};
};

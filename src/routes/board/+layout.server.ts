import { supabaseAdmin } from '$src/lib/server/admin';
import * as Sentry from '@sentry/sveltekit';
import type { LayoutServerLoad } from './$types';

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

export const load: LayoutServerLoad = async ({ locals: { user, supabase, session } }) => {
	if (!user) {
		return {
			providers: [],
			tokenCount: null,
			session
		};
	}

	const { data: providers, error: providersError } = await supabase
		.from('llmProvider')
		.select(
			`
            id,
            name,
            price,
            owner,
			maxTokens,
            userLLMProvider ( token )
        `
		)
		.eq('userLLMProvider.userId', user.id);

	if (providersError) {
		Sentry.captureException(providersError);
	}

	const providersHiddenTokens = (providers ?? []).map((provider) => {
		const token = provider.userLLMProvider[0]?.token;
		return {
			...provider,
			token: token != null ? hideToken(token) : null
		};
	});

	let tokenCount = 0;

	const { data: getTokenCount, error: tokenCountError } = await supabase
		.from('userTokenCount')
		.select('tokens')
		.eq('userId', user.id)
		.single();

	tokenCount = getTokenCount?.tokens ?? 0;

	if (tokenCountError || !getTokenCount) {
		const { data: insertTokenCount, error: insertError } = await supabaseAdmin
			.from('userTokenCount')
			.insert({ userId: user.id, tokens: 0 })
			.select('tokens')
			.single();

		if (insertError) {
			Sentry.captureException(insertError);
		}

		tokenCount = insertTokenCount?.tokens ?? 0;
	}

	// Load user metadata
	const { data: userMetadata, error: metadataError } = await supabase
		.from('userMetadata')
		.select('*')
		.eq('userId', user.id)
		.single();

	if (metadataError && metadataError.code !== 'PGRST116') {
		Sentry.captureException(metadataError);
	}

	return {
		providers: providersHiddenTokens,
		tokenCount,
		session,
		user,
		userMetadata
	};
};

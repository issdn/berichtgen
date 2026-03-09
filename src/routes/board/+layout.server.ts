import { supabaseAdmin } from '$src/lib/server/admin';
import * as Sentry from '@sentry/sveltekit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { user, supabase, session } }) => {
	if (!user) {
		return {
			tokenCount: null,
			session
		};
	}

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
		tokenCount,
		session,
		user,
		userMetadata
	};
};

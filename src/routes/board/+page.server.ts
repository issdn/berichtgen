import { supabaseAdmin } from '$src/lib/server/admin.js';
import * as Sentry from '@sentry/sveltekit';

export const load = async ({ locals: { user, supabase } }) => {
	if (!user) {
		return {
			tokenCount: null
		};
	}

	const { data, error } = await supabase
		.from('userTokenCount')
		.select('tokens')
		.eq('userId', user.id)
		.single();

	if (error || !data) {
		const { data: insertData, error: insertError } = await supabaseAdmin
			.from('userTokenCount')
			.insert({ userId: user.id, tokens: 0 })
			.select('tokens')
			.single();

		if (insertError) {
			Sentry.captureException(insertError);
		}

		return {
			tokenCount: insertData ? insertData.tokens : 0
		};
	}

	return {
		tokenCount: data.tokens
	};
};

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
		const { data: insertData } = await supabase
			.from('userTokenCount')
			.insert({ userId: user.id, tokens: 0 })
			.select('tokens')
			.single();

		return {
			tokenCount: insertData ? insertData.tokens : 0
		};
	}

	return {
		tokenCount: data.tokens
	};
};

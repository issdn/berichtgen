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

export const load = async ({ locals: { user, supabase } }) => {
	if (!user) {
		return {
			providers: []
		};
	}

	const { data: providers, error } = await supabase
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

	if (error || providers.length === 0) {
		return { providers: [] };
	}

	const providersHiddenTokens = providers.map((provider) => {
		const token = provider.userLLMProvider[0]?.token;
		return {
			...provider,
			token: token != null ? hideToken(token) : null
		};
	});

	return {
		providers: providersHiddenTokens
	};
};

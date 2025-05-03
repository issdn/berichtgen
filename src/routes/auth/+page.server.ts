import { json, redirect } from '@sveltejs/kit';

export const actions = {
	signin: async ({ locals: { supabase }, url }) => {
		const baseUrl = `${url.origin}/auth/callback?next=/board`;
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: baseUrl
			}
		});
		if (error) return json({ error: error.message }, { status: 500 });
		if (data.url) {
			redirect(303, data.url);
		}
	},
	signout: async ({ locals: { supabase } }) => {
		const { error } = await supabase.auth.signOut();
		if (error) return json({ error: error.message }, { status: 500 });
		redirect(303, '/');
	}
};

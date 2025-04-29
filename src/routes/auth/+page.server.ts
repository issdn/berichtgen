import { json, redirect } from '@sveltejs/kit';

export const actions = {
	signin: async ({ locals: { supabase } }) => {
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: 'http://localhost:5173/auth/callback?next=/board'
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

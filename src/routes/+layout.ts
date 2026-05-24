import type { SupabaseDatabase } from '$lib/schema.js';

import {
	PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	PUBLIC_SUPABASE_URL
} from '$env/static/public';
import {
	createBrowserClient,
	createServerClient,
	isBrowser
} from '@supabase/ssr';

export const load = async ({
	data: { cookies, profile, session, user },
	depends,
	fetch
}) => {
	/**
	 * Declare a dependency so the layout can be invalidated, for example, on
	 * session refresh.
	 */
	depends('supabase:auth');

	const supabase = isBrowser()
		? createBrowserClient<SupabaseDatabase, 'private'>(
				PUBLIC_SUPABASE_URL,
				PUBLIC_SUPABASE_PUBLISHABLE_KEY,
				{
					db: { schema: 'private' },
					global: {
						fetch
					}
				}
			)
		: createServerClient<SupabaseDatabase, 'private'>(
				PUBLIC_SUPABASE_URL,
				PUBLIC_SUPABASE_PUBLISHABLE_KEY,
				{
					cookies: {
						getAll() {
							return cookies;
						}
					},
					db: { schema: 'private' },
					global: {
						fetch
					}
				}
			);

	return { loggedIn: !!user, profile, session, supabase, user };
};

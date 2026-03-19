import {
	createBrowserClient,
	createServerClient,
	isBrowser
} from '@supabase/ssr';
import {
	PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	PUBLIC_SUPABASE_URL
} from '$env/static/public';
import { type Database } from '$src/lib/database.types.js';

export const load = async ({
	data: { profile, user, cookies, session },
	depends,
	fetch
}) => {
	/**
	 * Declare a dependency so the layout can be invalidated, for example, on
	 * session refresh.
	 */
	depends('supabase:auth');

	const supabase = isBrowser()
		? createBrowserClient<Database>(
				PUBLIC_SUPABASE_URL,
				PUBLIC_SUPABASE_PUBLISHABLE_KEY,
				{
					global: {
						fetch
					}
				}
			)
		: createServerClient<Database>(
				PUBLIC_SUPABASE_URL,
				PUBLIC_SUPABASE_PUBLISHABLE_KEY,
				{
					global: {
						fetch
					},
					cookies: {
						getAll() {
							return cookies;
						}
					}
				}
			);

	return { supabase, session, user, profile };
};

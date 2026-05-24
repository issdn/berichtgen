import type { SupabaseDatabase } from '$lib/schema';

import { SUPABASE_SECRET } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient<SupabaseDatabase, 'private'>(
	PUBLIC_SUPABASE_URL,
	SUPABASE_SECRET,
	{
		db: { schema: 'private' }
	}
);

import { SUPABASE_SECRET } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { KyselyDatabase } from '$lib/schema';
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient<KyselyDatabase>(
	PUBLIC_SUPABASE_URL,
	SUPABASE_SECRET
);

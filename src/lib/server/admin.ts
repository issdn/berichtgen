import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SECRET } from '$env/static/private';
import { createClient } from '@supabase/supabase-js';
import type { KyselyDatabase } from '../schema';

export const supabaseAdmin = createClient<KyselyDatabase>(
	PUBLIC_SUPABASE_URL,
	SUPABASE_SECRET
);

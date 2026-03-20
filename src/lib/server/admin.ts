import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SECRET } from '$env/static/private';
import { type Database } from '$src/lib/database.types';
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient<Database>(
	PUBLIC_SUPABASE_URL,
	SUPABASE_SECRET
);

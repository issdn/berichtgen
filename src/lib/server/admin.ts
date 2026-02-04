import { PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { type Database } from '$src/lib/database.types';
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient<Database>(
	PUBLIC_SUPABASE_URL,
	PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

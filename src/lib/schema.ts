import type { KyselifyTable } from 'kysely-supabase';

import type { Database as SupabaseDatabase } from './supabase.database';

export type KyselyDatabase = {
	[Table in keyof SupabaseDatabase['private']['Tables']]: SupabaseDatabase['private']['Tables'][Table]['Row'];
};

export type KyselyQueryDatabase = {
	[Table in keyof SupabaseDatabase['private']['Tables']]: KyselifyTable<
		SupabaseDatabase['private']['Tables'][Table]
	>;
};

export type { SupabaseDatabase };

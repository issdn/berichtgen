import type { KyselifyDatabase } from 'kysely-supabase';
import type { Database as SupabaseDatabase } from './supabase.database';

type KyselyDatabaseWithSchema = KyselifyDatabase<SupabaseDatabase>;

export type KyselyQueryDatabase = {
	[Name in keyof KyselyDatabaseWithSchema as Name extends `private.${infer Table}`
		? Table
		: never]: KyselyDatabaseWithSchema[Name];
};

export type KyselyDatabase = {
	[Table in keyof SupabaseDatabase['private']['Tables']]: SupabaseDatabase['private']['Tables'][Table]['Row'];
};

export type { SupabaseDatabase };

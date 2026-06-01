import type { KyselyQueryDatabase } from '$lib/schema';

import { dev } from '$app/environment';
import { DATABASE_URL, SUPABASE_CA } from '$env/static/private';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

if (!dev && !SUPABASE_CA) {
	throw new Error('SUPABASE_CA is required in production');
}

const ssl = SUPABASE_CA
	? {
			ca: SUPABASE_CA,
			rejectUnauthorized: true
		}
	: undefined;

const db = new Kysely<KyselyQueryDatabase>({
	dialect: new PostgresDialect({
		pool: new pg.Pool({
			connectionString: DATABASE_URL,
			options: '-c search_path=private',
			ssl
		})
	})
});

export default db;

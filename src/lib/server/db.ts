import { DATABASE_URL } from '$env/static/private';
import type { KyselyDatabase } from '$lib/schema';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

const db = new Kysely<KyselyDatabase>({
	dialect: new PostgresDialect({
		pool: new pg.Pool({
			connectionString: DATABASE_URL,
			ssl: { rejectUnauthorized: true, ca: process.env.SUPABASE_CA }
		})
	})
});

export default db;

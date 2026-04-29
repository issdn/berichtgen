import { dev } from '$app/environment';
import { DATABASE_URL } from '$env/static/private';
import type { KyselyDatabase } from '$lib/schema';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

const ssl = dev
	? undefined
	: { rejectUnauthorized: true, ca: process.env.SUPABASE_CA };

const db = new Kysely<KyselyDatabase>({
	dialect: new PostgresDialect({
		pool: new pg.Pool({
			connectionString: DATABASE_URL,
			ssl
		})
	})
});

export default db;

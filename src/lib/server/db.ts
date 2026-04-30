import { dev } from '$app/environment';
import { DATABASE_URL } from '$env/static/private';
import type { KyselyQueryDatabase } from '$lib/schema';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

const ca = process.env.SUPABASE_CA;
const ssl_deactivated = !dev && !ca;

if (ssl_deactivated) {
	console.warn('SUPABASE_CA is not set.');
}

const ssl = ssl_deactivated
	? undefined
	: { rejectUnauthorized: true, ca: process.env.SUPABASE_CA };

const db = new Kysely<KyselyQueryDatabase>({
	dialect: new PostgresDialect({
		pool: new pg.Pool({
			connectionString: DATABASE_URL,
			ssl,
			options: '-c search_path=private'
		})
	})
});

export default db;

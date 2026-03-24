import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import { DATABASE_URL } from '$env/static/private';
import type { KyselyDatabase } from '../schema';

export const db = new Kysely<KyselyDatabase>({
	dialect: new PostgresDialect({
		pool: new pg.Pool({ connectionString: DATABASE_URL })
	})
});

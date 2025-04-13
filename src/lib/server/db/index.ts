import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(env.POSTGRES_URL, { prepare: false });
export const db = drizzle({ client });

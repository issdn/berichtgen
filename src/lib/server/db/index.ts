import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/postgres-js';
import { dev } from '$app/environment';
import postgres from 'postgres';

const client = postgres(dev ? env.LOCAL_POSTGRES_URL! : env.POSTGRES_URL!, { prepare: false });
export const db = drizzle({ client });

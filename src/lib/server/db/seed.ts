import { createClient } from '@libsql/client';
import { llmProviders } from './schema';
import { drizzle } from 'drizzle-orm/libsql';

const client = createClient({ url: process.env.DATABASE_URL! });
export const db = drizzle(client);
await db.insert(llmProviders).values([
	{ name: 'Deepseek', price: 0.3, url: 'https://api.deepsek.com' },
	{ name: 'Claude', price: 0.6, url: 'https://api.claude.com' }
]);

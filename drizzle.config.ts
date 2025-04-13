import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './supabase/migrations',
	dbCredentials: {
		host: process.env.POSTGRES_HOST!,
		port: 6543,
		user: process.env.POSTGRES_USER!,
		password: process.env.POSTGRES_PASSWORD!,
		database: process.env.POSTGRES_DATABASE!,
		ssl: {
			ca: process.env.DB_CA!
		}
	},
	verbose: true,
	strict: true,
	dialect: 'postgresql'
});

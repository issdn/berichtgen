/**
 * Creates a test user and uploads src/test/fixtures/template.docx to their storage subfolder.
 * Also inserts the template metadata row directly (trigger removed).
 *
 * Usage: node --experimental-strip-types src/test/scripts/seed-template.ts
 */

import type { SupabaseDatabase } from '$lib/schema';

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { Kysely, PostgresDialect } from 'kysely';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

// Running this script with plain `node` does not auto-load `.env`.
loadEnv();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY || !DATABASE_URL) {
	console.error(
		'Missing PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET, or DATABASE_URL env vars.'
	);
	process.exit(1);
}

const id = Math.random().toString(36).slice(2, 8);
const TEST_EMAIL = `test-seed-${id}@berichtgen.local`;
const TEST_PASSWORD = `seed-${id}-password!`;

const supabase = createClient<SupabaseDatabase, 'private'>(
	SUPABASE_URL,
	ANON_KEY,
	{
		auth: { autoRefreshToken: false, persistSession: false },
		db: { schema: 'private' }
	}
);

const admin = createClient<SupabaseDatabase, 'private'>(
	SUPABASE_URL,
	SERVICE_ROLE_KEY,
	{
		auth: { autoRefreshToken: false, persistSession: false },
		db: { schema: 'private' }
	}
);

const db = new Kysely<{
	template: { storage_path: string; user_id: string; };
	user_token_count: { tokens: number; user_id: string; };
}>({
	dialect: new PostgresDialect({
		pool: new pg.Pool({
			connectionString: DATABASE_URL,
			options: '-c search_path=private'
		})
	})
});

// 1. Sign up a fresh random user
console.log(`Creating user ${TEST_EMAIL}...`);
const { error: signUpError } = await supabase.auth.signUp({
	email: TEST_EMAIL,
	password: TEST_PASSWORD
});
if (signUpError) throw signUpError;

const signInResult = await supabase.auth.signInWithPassword({
	email: TEST_EMAIL,
	password: TEST_PASSWORD
});
if (signInResult.error) {
	console.error(
		'Sign-in failed. If email confirmation is required, disable it in the Supabase dashboard for local dev.'
	);
	throw signInResult.error;
}

const user = signInResult.data.user!;
console.log('Signed in as:', user.id);

const templateName = `template-${id}.docx`;

// 2. Upload the template file using the admin client (storage policies removed)
const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFilePath);
const templatePath = join(currentDir, '..', 'fixtures', 'template.docx');
const fileBytes = readFileSync(templatePath);
const file = new File([fileBytes], templateName, {
	type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
});

const storagePath = `${user.id}/${templateName}`;
console.log(`Uploading to templates/${storagePath}...`);

const { error: uploadError } = await admin.storage
	.from('templates')
	.upload(storagePath, file, { contentType: file.type, upsert: true });

if (uploadError) throw uploadError;
console.log('Upload successful.');

// 3. Insert template metadata row (insert trigger removed)
await db
	.deleteFrom('template')
	.where('storage_path', '=', storagePath)
	.execute();
await db
	.insertInto('template')
	.values({ storage_path: storagePath, user_id: user.id })
	.execute();
console.log('Template metadata row created.');

// 4. Grant the test user a large token balance
await db
	.insertInto('user_token_count')
	.values({ tokens: 999000, user_id: user.id })
	.onConflict((oc) => oc.column('user_id').doUpdateSet({ tokens: 999000 }))
	.execute();
console.log('Token balance set to 999000.');

console.log(
	`\nTest user:\n  email:    ${TEST_EMAIL}\n  password: ${TEST_PASSWORD}\n  user_id:  ${user.id}`
);

await db.destroy();

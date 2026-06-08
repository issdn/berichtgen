/**
 * Creates a test user and uploads one public and one private template into the
 * user's storage subfolders. Storage triggers create the template rows.
 *
 * Usage: node --experimental-strip-types src/test/scripts/seed-template.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { Kysely, PostgresDialect } from 'kysely';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

import type { SupabaseDatabase } from '../../lib/schema';

const PRIVACY_CONSENT_GRANTED_METADATA_KEY = 'consent_granted';
const PRIVACY_CONSENT_VERSION_METADATA_KEY = 'privacy_consent_version';

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
	template: { is_public: boolean; storage_path: string; user_id: string };
	user_token_count: { tokens: number; user_id: string };
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
	options: {
		data: {
			[PRIVACY_CONSENT_GRANTED_METADATA_KEY]: true,
			[PRIVACY_CONSENT_VERSION_METADATA_KEY]:
				process.env.npm_package_version ?? 'seed-script'
		}
	},
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

const publicTemplateName = `template-public-${id}.docx`;
const privateTemplateName = `template-private-${id}.docx`;

// 2. Upload the template file using the admin client (storage policies removed)
const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFilePath);
const templatePath = join(currentDir, '..', 'fixtures', 'template.docx');
const fileBytes = readFileSync(templatePath);
const file = new File([fileBytes], publicTemplateName, {
	type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
});

const publicStoragePath = `${user.id}/${publicTemplateName}`;
const privateStoragePath = `${user.id}/${privateTemplateName}`;

console.log(`Uploading public template to templates/${publicStoragePath}...`);
const { error: publicUploadError } = await admin.storage
	.from('templates')
	.upload(publicStoragePath, file, { contentType: file.type, upsert: true });

if (publicUploadError) throw publicUploadError;
console.log('Public upload successful.');

console.log(
	`Uploading private template to private-templates/${privateStoragePath}...`
);
const { error: privateUploadError } = await admin.storage
	.from('private-templates')
	.upload(
		privateStoragePath,
		new File([fileBytes], privateTemplateName, {
			type: file.type
		}),
		{ contentType: file.type, upsert: true }
	);

if (privateUploadError) throw privateUploadError;
console.log('Private upload successful.');

// 3. Verify that storage triggers created both template rows
const templateRows = await db
	.selectFrom('template')
	.select(['is_public', 'storage_path', 'user_id'])
	.where('user_id', '=', user.id)
	.where('storage_path', 'in', [publicStoragePath, privateStoragePath])
	.execute();
const publicTemplate = templateRows.find(
	(template) => template.storage_path === publicStoragePath
);
const privateTemplate = templateRows.find(
	(template) => template.storage_path === privateStoragePath
);

if (!publicTemplate || !privateTemplate) {
	throw new Error(
		`Expected both template rows from storage triggers, got ${templateRows.length}.`
	);
}

if (!publicTemplate.is_public || privateTemplate.is_public) {
	throw new Error('Template visibility flags do not match their buckets.');
}
console.log('Template metadata rows created via storage triggers.');

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

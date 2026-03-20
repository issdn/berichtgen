/**
 * Creates a test user and uploads src/test/template.docx to their storage subfolder.
 * Also inserts the template metadata row directly (trigger removed).
 *
 * Usage: bun src/test/seed-template.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
	console.error(
		'Missing PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, or SUPABASE_SECRET env vars.'
	);
	process.exit(1);
}

const id = Math.random().toString(36).slice(2, 8);
const TEST_EMAIL = `test-seed-${id}@berichtgen.local`;
const TEST_PASSWORD = `seed-${id}-password!`;

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});

// 1. Sign up a fresh random user
console.log(`Creating user ${TEST_EMAIL}…`);
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

// 2. Upload the template file using the admin client (storage policies removed)
const templatePath = join(import.meta.dir, 'template.docx');
const fileBytes = readFileSync(templatePath);
const file = new File([fileBytes], 'template.docx', {
	type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
});

const storagePath = `${user.id}/template.docx`;
console.log(`Uploading to templates/${storagePath}…`);

const { error: uploadError } = await admin.storage
	.from('templates')
	.upload(storagePath, file, { upsert: true, contentType: file.type });

if (uploadError) throw uploadError;
console.log('Upload successful.');

// 3. Insert template metadata row (insert trigger removed)
await admin.from('template').delete().eq('storage_path', storagePath);

const { error: insertError } = await admin
	.from('template')
	.insert({ user_id: user.id, storage_path: storagePath });

if (insertError) throw insertError;
console.log('Template metadata row created.');

// 4. Grant the test user a large token balance
const { error: tokenError } = await admin
	.from('user_token_count')
	.upsert({ user_id: user.id, tokens: 9990000000 }, { onConflict: 'user_id' });
if (tokenError) throw tokenError;
console.log('Token balance set to 9990000000.');

console.log(
	`\nTest user:\n  email:    ${TEST_EMAIL}\n  password: ${TEST_PASSWORD}\n  user_id:  ${user.id}`
);

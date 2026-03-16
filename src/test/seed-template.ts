/**
 * Creates a test user and uploads src/test/template.docx to their storage subfolder.
 *
 * The insert trigger (on_new_file_insert_create_metadata) creates the template
 * metadata row automatically once the file lands in the bucket.
 *
 * Usage: bun src/test/seed-template.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
	console.error('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY env vars.');
	process.exit(1);
}

const TEST_EMAIL = 'test-seed@berichtgen.local';
const TEST_PASSWORD = 'seed-password-123!';

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});

// 1. Try signing in first (user may already exist)
console.log('Signing in as test user…');
let signInResult = await supabase.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });

if (signInResult.error) {
	// User doesn't exist yet — sign up
	console.log('User not found, signing up…');
	const { error: signUpError } = await supabase.auth.signUp({ email: TEST_EMAIL, password: TEST_PASSWORD });
	if (signUpError) throw signUpError;

	// Sign in after signup
	signInResult = await supabase.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
	if (signInResult.error) {
		console.error('Sign-in after sign-up failed. If email confirmation is required, confirm the user in the Supabase dashboard first, then re-run.');
		throw signInResult.error;
	}
}

const user = signInResult.data.user!;
console.log('Signed in as:', user.id);

// 2. Upload the template file under the user's subfolder
const templatePath = join(import.meta.dir, 'template.docx');
const fileBytes = readFileSync(templatePath);
const file = new File([fileBytes], 'template.docx', {
	type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
});

const storagePath = `${user.id}/template.docx`;
console.log(`Uploading to templates/${storagePath}…`);

const { error: uploadError } = await supabase.storage
	.from('templates')
	.upload(storagePath, file, { upsert: true, contentType: file.type });

if (uploadError) throw uploadError;

console.log('Upload successful.');
console.log('The insert trigger will create the template metadata row automatically.');
console.log(`\nTest user:\n  email:    ${TEST_EMAIL}\n  password: ${TEST_PASSWORD}\n  user_id:  ${user.id}`);

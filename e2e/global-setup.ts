import { chromium, type FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'node:fs';
import * as path from 'node:path';

/** Parse a .env file into process.env without overwriting existing values. */
function loadEnvFile(filePath: string): void {
	if (!fs.existsSync(filePath)) return;
	const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eqIdx = trimmed.indexOf('=');
		if (eqIdx === -1) continue;
		const key = trimmed.slice(0, eqIdx).trim();
		const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
		if (!(key in process.env)) process.env[key] = value;
	}
}

loadEnvFile('.env');
loadEnvFile('.env.local');

/** @supabase/ssr splits cookies at this byte threshold */
const CHUNK_SIZE = 3180;
const AUTH_FILE = 'e2e/.auth/user.json';

/**
 * Playwright globalSetup — creates a fresh Supabase test user, seeds the
 * required template + token balance, then authenticates and saves the
 * resulting session cookies so every test starts fully authenticated.
 *
 * Required env vars (in .env or .env.local):
 *   PUBLIC_SUPABASE_URL              — Supabase project URL
 *   PUBLIC_SUPABASE_PUBLISHABLE_KEY  — anon/publishable key
 *   SUPABASE_SECRET                  — service-role key (for admin seeding)
 */
async function globalSetup(config: FullConfig): Promise<void> {
	const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
	const anonKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	const serviceRoleKey = process.env.SUPABASE_SECRET;

	if (!supabaseUrl || !anonKey || !serviceRoleKey) {
		throw new Error(
			'E2E globalSetup requires PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY ' +
				'and SUPABASE_SECRET to be set in .env or .env.local'
		);
	}

	const supabase = createClient(supabaseUrl, anonKey, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
	const admin = createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false }
	});

	// ── 1. Create a fresh random test user ──────────────────────────────────
	const id = Math.random().toString(36).slice(2, 8);
	const email = `e2e-${id}@berichtgen.local`;
	const password = `e2e-${id}-pw!`;

	const { error: signUpError } = await supabase.auth.signUp({ email, password });
	if (signUpError) throw new Error(`signUp failed: ${signUpError.message}`);

	const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
		email,
		password
	});
	if (signInError) {
		throw new Error(
			`signIn failed (if email confirmation is required, disable it in the Supabase dashboard): ${signInError.message}`
		);
	}

	const userId = signInData.user!.id;
	const session = signInData.session!;

	// ── 2. Upload template.docx to storage ──────────────────────────────────
	const templatePath = path.join('src', 'test', 'template.docx');
	if (!fs.existsSync(templatePath)) {
		throw new Error(`Template fixture not found at ${templatePath} — run seed-template.ts first`);
	}

	const fileBytes = fs.readFileSync(templatePath);
	const storagePath = `${userId}/template.docx`;

	const { error: uploadError } = await admin.storage
		.from('templates')
		.upload(storagePath, fileBytes, {
			upsert: true,
			contentType:
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
		});
	if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

	// ── 3. Insert template metadata row ─────────────────────────────────────
	await admin.from('template').delete().eq('storage_path', storagePath);
	const { error: insertError } = await admin
		.from('template')
		.insert({ user_id: userId, storage_path: storagePath });
	if (insertError) throw new Error(`Template insert failed: ${insertError.message}`);

	// ── 4. Grant a large token balance ──────────────────────────────────────
	const { error: tokenError } = await admin
		.from('user_token_count')
		.upsert({ user_id: userId, tokens: 2_000_000_000 }, { onConflict: 'user_id' });
	if (tokenError) throw new Error(`Token upsert failed: ${tokenError.message}`);

	// ── 5. Inject session cookies and save storage state ────────────────────
	// Derive the project ref that @supabase/ssr uses as the cookie name prefix
	const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
	const cookieName = `sb-${projectRef}-auth-token`;
	const cookieValue = JSON.stringify(session);

	const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:5173';
	const domain = new URL(baseURL).hostname;

	type Cookie = {
		name: string;
		value: string;
		domain: string;
		path: string;
		httpOnly: false;
		sameSite: 'Lax';
	};

	// @supabase/ssr chunks the cookie value when it exceeds CHUNK_SIZE bytes
	const cookies: Cookie[] = [];
	if (cookieValue.length <= CHUNK_SIZE) {
		cookies.push({
			name: cookieName,
			value: cookieValue,
			domain,
			path: '/',
			httpOnly: false,
			sameSite: 'Lax'
		});
	} else {
		let chunkIndex = 0;
		for (let offset = 0; offset < cookieValue.length; offset += CHUNK_SIZE, chunkIndex++) {
			cookies.push({
				name: `${cookieName}.${chunkIndex}`,
				value: cookieValue.slice(offset, offset + CHUNK_SIZE),
				domain,
				path: '/',
				httpOnly: false,
				sameSite: 'Lax'
			});
		}
	}

	const browser = await chromium.launch();
	const context = await browser.newContext({ baseURL });
	await context.addCookies(cookies);

	// Navigate to /board to confirm the server accepts the session
	const page = await context.newPage();
	await page.goto('/board');
	await page.waitForURL('**/board', { timeout: 15_000 });

	fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
	await context.storageState({ path: AUTH_FILE });
	await browser.close();
}

export default globalSetup;

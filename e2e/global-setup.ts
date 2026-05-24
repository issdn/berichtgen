import { chromium, type FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { Kysely, PostgresDialect } from 'kysely';
import * as fs from 'node:fs';
import * as path from 'node:path';
import pg from 'pg';

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
		const value = trimmed
			.slice(eqIdx + 1)
			.trim()
			.replace(/^["']|["']$/g, '');
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
	const databaseUrl = process.env.DATABASE_URL;

	if (!supabaseUrl || !anonKey || !serviceRoleKey || !databaseUrl) {
		throw new Error(
			'E2E globalSetup requires PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY ' +
				'SUPABASE_SECRET and DATABASE_URL to be set in .env or .env.local'
		);
	}

	const supabase = createClient(supabaseUrl, anonKey, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
	const admin = createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false }
	});

	const db = new Kysely<{
		template: { storage_path: string; user_id: string; };
		user_token_count: { tokens: number; user_id: string; };
	}>({
		dialect: new PostgresDialect({
			pool: new pg.Pool({
				connectionString: databaseUrl,
				options: '-c search_path=private'
			})
		})
	});

	// ── 1. Create a fresh random test user ──────────────────────────────────
	const id = Math.random().toString(36).slice(2, 8);
	const email = `e2e-${id}@berichtgen.local`;
	const password = `e2e-${id}-pw!`;

	const { error: signUpError } = await supabase.auth.signUp({
		email,
		password
	});
	if (signUpError) throw new Error(`signUp failed: ${signUpError.message}`);

	const { data: signInData, error: signInError } =
		await supabase.auth.signInWithPassword({
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
	const templatePath = path.join('src', 'test', 'fixtures', 'template.docx');
	if (!fs.existsSync(templatePath)) {
		throw new Error(
			`Template fixture not found at ${templatePath} — run seed-template.ts first`
		);
	}

	const fileBytes = fs.readFileSync(templatePath);
	const storagePath = `${userId}/template.docx`;

	const { error: uploadError } = await admin.storage
		.from('templates')
		.upload(storagePath, fileBytes, {
			contentType:
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			upsert: true
		});
	if (uploadError)
		throw new Error(`Storage upload failed: ${uploadError.message}`);

	// ── 3. Insert template metadata row ─────────────────────────────────────
	await db
		.deleteFrom('template')
		.where('storage_path', '=', storagePath)
		.execute();
	await db
		.insertInto('template')
		.values({ storage_path: storagePath, user_id: userId })
		.execute();

	// ── 4. Grant a large token balance ──────────────────────────────────────
	await db
		.insertInto('user_token_count')
		.values({ tokens: 2_000_000_000, user_id: userId })
		.onConflict((oc) =>
			oc.column('user_id').doUpdateSet({ tokens: 2_000_000_000 })
		)
		.execute();

	// ── 5. Inject session cookies and save storage state ────────────────────
	// Derive the project ref that @supabase/ssr uses as the cookie name prefix
	const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
	const cookieName = `sb-${projectRef}-auth-token`;
	const cookieValue = JSON.stringify(session);

	const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:5173';
	const domain = new URL(baseURL).hostname;

	type Cookie = {
		domain: string;
		httpOnly: false;
		name: string;
		path: string;
		sameSite: 'Lax';
		value: string;
	};

	// @supabase/ssr chunks the cookie value when it exceeds CHUNK_SIZE bytes
	const cookies: Cookie[] = [];
	if (cookieValue.length <= CHUNK_SIZE) {
		cookies.push({
			domain,
			httpOnly: false,
			name: cookieName,
			path: '/',
			sameSite: 'Lax',
			value: cookieValue
		});
	} else {
		let chunkIndex = 0;
		for (
			let offset = 0;
			offset < cookieValue.length;
			offset += CHUNK_SIZE, chunkIndex++
		) {
			cookies.push({
				domain,
				httpOnly: false,
				name: `${cookieName}.${chunkIndex}`,
				path: '/',
				sameSite: 'Lax',
				value: cookieValue.slice(offset, offset + CHUNK_SIZE)
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
	await db.destroy();
}

export default globalSetup;

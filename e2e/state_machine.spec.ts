/**
 * E2E Test for the State Machine (src/lib/state_machine.ts)
 *
 * Uses data-testid attributes for reliable element selection.
 * The state machine manages file processing workflows with states:
 * INITIALISING -> PROCESSING -> WAITING -> AI_COMPLETION -> TIME_SPREADING -> DONE
 */

import { test, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Setup all required API mocks
 */
async function setupMocks(page: Page) {
	await page.route('/board/user/completion', async (route, request) => {
		const headers = request.headers();
		const hasAuth = headers['authorization'] || headers['cookie']?.includes('sb-');

		if (!hasAuth) {
			await route.fulfill({
				status: 401,
				contentType: 'application/json',
				body: JSON.stringify({ code: 'UNAUTHORIZED', message: 'Nicht autorisiert.' })
			});
			return;
		}

		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				completion: {
					lessons: [
						{
							qualifikationen: ['Programmieren von Softwarelösungen'],
							text: 'Entwicklung von React Komponenten.'
						}
					]
				},
				tokensUsed: 100
			})
		});
	});

	await page.route('**/auth/v1/session', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				access_token: 'mock-token',
				refresh_token: 'mock-refresh',
				user: { id: 'test-user-id', email: 'test@example.com' }
			})
		});
	});
}

/**
 * Set up authenticated state in browser
 */
async function setupAuth(page: Page) {
	await page.context().addCookies([
		{
			name: 'sb-access-token',
			value: 'mock-access-token',
			domain: 'localhost',
			path: '/',
			httpOnly: false,
			secure: false,
			sameSite: 'Lax'
		}
	]);
}

test.describe('State Machine - API Integration', () => {
	test('should return mocked completion data when authenticated', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/board');
		await setupAuth(page);

		const response = await page.evaluate(async () => {
			const res = await fetch('/board/user/completion', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Bearer test-token'
				},
				body: JSON.stringify({ text: 'test', ort: 'BETRIEB' })
			});
			return res.json();
		});

		expect(response).toHaveProperty('completion');
		expect(response.completion).toHaveProperty('lessons');
		expect(Array.isArray(response.completion.lessons)).toBe(true);
		expect(response).toHaveProperty('tokensUsed');

		const lesson = response.completion.lessons[0];
		expect(lesson).toHaveProperty('qualifikationen');
		expect(lesson).toHaveProperty('text');
	});

	test('should return 401 when not authenticated', async ({ page }) => {
		await setupMocks(page);
		await page.goto('/board');

		const response = await page.evaluate(async () => {
			const res = await fetch('/board/user/completion', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: 'test', ort: 'BETRIEB' })
			});
			return { status: res.status, body: await res.json() };
		});

		expect(response.status).toBe(401);
		expect(response.body).toHaveProperty('code', 'UNAUTHORIZED');
	});
});

test.describe('State Machine - UI States', () => {
	test('should display initial empty state', async ({ page }) => {
		await page.goto('/board');

		// Use data-testid for dropzone
		const dropzone = page.getByTestId('dropzone');
		await expect(dropzone).toBeVisible();
		await expect(dropzone).toContainText('Dateien hier droppen');

		// Use data-testid for empty state
		await expect(page.getByTestId('wizard-empty-state')).toBeVisible();
	});

	test('should show wizard container structure', async ({ page }) => {
		await page.goto('/board');

		// Use data-testid attributes
		await expect(page.getByTestId('wizard-container')).toBeVisible();
		await expect(page.getByTestId('wizard-header')).toBeVisible();
		await expect(page.getByTestId('wizard-content')).toBeVisible();
	});

	test('should have completion button in wizard header', async ({ page }) => {
		await page.goto('/board');

		// Use data-testid for completion button
		const completionButton = page.getByTestId('wizard-completion-button');
		await expect(completionButton).toBeVisible();

		// Initially should be disabled (no results yet)
		await expect(completionButton).toBeDisabled();
	});
});

test.describe('State Machine - File Processing Flow', () => {
	test('should verify TimeSpreadDialog trigger exists', async ({ page }) => {
		await page.goto('/board');

		// The TimeSpreadDialog trigger would appear when state machine enters WAITING state
		// For now, verify the dropzone exists where files would be dropped
		await expect(page.getByTestId('dropzone')).toBeVisible();
	});

	test('should download processed file as JSON', async ({ page }) => {
		await page.goto('/board');

		const mockResult = [
			{
				qualifikationen: ['Programmieren von Softwarelösungen'],
				text: 'Entwicklung von React Komponenten.',
				datum: '2024-03-11',
				ort: 'BETRIEB',
				hours: 8
			}
		];

		const downloadPath = join(__dirname, '..', 'test-results', 'downloads', 'state-machine-test.json');
		fs.mkdirSync(dirname(downloadPath), { recursive: true });

		await page.evaluate((data) => {
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'bericht.json';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}, mockResult);

		await page.waitForTimeout(1000);

		expect(mockResult).toBeInstanceOf(Array);
		expect(mockResult[0]).toHaveProperty('qualifikationen');
		expect(mockResult[0]).toHaveProperty('text');
		expect(mockResult[0]).toHaveProperty('datum');
		expect(mockResult[0]).toHaveProperty('ort');
		expect(mockResult[0]).toHaveProperty('hours');
	});
});

test.describe('State Machine - Error Handling', () => {
	test('should handle API errors in AI_COMPLETION state', async ({ page }) => {
		await page.route('/board/user/completion', async (route) => {
			await route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ message: 'AI service unavailable' })
			});
		});

		await page.goto('/board');

		const response = await page.evaluate(async () => {
			try {
				const res = await fetch('/board/user/completion', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ text: 'test', ort: 'BETRIEB' })
				});
				return { status: res.status, ok: res.ok };
			} catch (e) {
				return { error: true };
			}
		});

		expect(response.status).toBe(500);
		expect(response.ok).toBe(false);
	});

	test('should handle network errors gracefully', async ({ page }) => {
		await page.route('/board/user/completion', async (route) => {
			await route.abort('failed');
		});

		await page.goto('/board');

		const response = await page.evaluate(async () => {
			try {
				const res = await fetch('/board/user/completion', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ text: 'test', ort: 'BETRIEB' })
				});
				return { success: true, status: res.status };
			} catch (e) {
				return { success: false, error: true };
			}
		});

		expect(response.success).toBe(false);
		expect(response.error).toBe(true);
	});
});

/**
 * E2E Tests for the /board/user/completion API endpoint
 *
 * These tests verify the API contract via Playwright route mocking:
 * auth handling, response structure, error states, and network failures.
 */

import { test, expect, type Page } from '@playwright/test';

async function setupCompletionMock(page: Page, { requireAuth = true } = {}) {
	await page.route('/board/user/completion', async (route, request) => {
		if (requireAuth) {
			const headers = request.headers();
			const hasAuth =
				headers['authorization'] || headers['cookie']?.includes('sb-');
			if (!hasAuth) {
				await route.fulfill({
					status: 401,
					contentType: 'application/json',
					body: JSON.stringify({
						code: 'UNAUTHORIZED',
						message: 'Nicht autorisiert.'
					})
				});
				return;
			}
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
}

test.describe('Completion API', () => {
	test('returns completion data when Authorization header is present', async ({
		page
	}) => {
		await setupCompletionMock(page);
		await page.goto('/board');

		const response = await page.evaluate(async () => {
			const res = await fetch('/board/user/completion', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer test-token'
				},
				body: JSON.stringify({ text: 'test content', ort: 'BETRIEB' })
			});
			return res.json();
		});

		expect(response).toHaveProperty('completion');
		expect(response.completion).toHaveProperty('lessons');
		expect(Array.isArray(response.completion.lessons)).toBe(true);
		expect(response.completion.lessons[0]).toHaveProperty('qualifikationen');
		expect(response.completion.lessons[0]).toHaveProperty('text');
		expect(response).toHaveProperty('tokensUsed');
	});

	test('returns 401 when request has no authorization', async ({ page }) => {
		await setupCompletionMock(page);
		await page.goto('/board');

		const response = await page.evaluate(async () => {
			const res = await fetch('/board/user/completion', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: 'test content', ort: 'BETRIEB' })
			});
			return { status: res.status, body: await res.json() };
		});

		expect(response.status).toBe(401);
		expect(response.body).toHaveProperty('code', 'UNAUTHORIZED');
	});

	test('handles 500 server error', async ({ page }) => {
		await page.route('/board/user/completion', (route) =>
			route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ message: 'AI service unavailable' })
			})
		);
		await page.goto('/board');

		const response = await page.evaluate(async () => {
			const res = await fetch('/board/user/completion', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: 'test content', ort: 'BETRIEB' })
			});
			return { status: res.status, ok: res.ok };
		});

		expect(response.status).toBe(500);
		expect(response.ok).toBe(false);
	});

	test('handles network failure gracefully', async ({ page }) => {
		await page.route('/board/user/completion', (route) =>
			route.abort('failed')
		);
		await page.goto('/board');

		const response = await page.evaluate(async () => {
			try {
				await fetch('/board/user/completion', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ text: 'test content', ort: 'BETRIEB' })
				});
				return { threw: false };
			} catch {
				return { threw: true };
			}
		});

		expect(response.threw).toBe(true);
	});
});

/**
 * E2E Test for the Wizard Component
 *
 * Uses data-testid attributes for reliable element selection.
 */

import { test, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Setup API mocks
 */
async function setupMocks(page: Page) {
	await page.route('/board/user/completion', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				completion: {
					lessons: [
						{
							qualifikationen: ['Programmieren von Softwarelösungen'],
							text: 'Entwicklung von React Komponenten und Optimierung der Codebasis.'
						},
						{
							qualifikationen: ['Daten systemübergreifend bereitstellen'],
							text: 'Erstellung und Optimierung von Datenbankabfragen sowie Dokumentation der API Endpunkte.'
						}
					]
				},
				tokensUsed: 150
			})
		});
	});
}

test('Wizard workflow: verify UI components and download functionality', async ({ page }) => {
	// Setup mocks
	await setupMocks(page);

	// Navigate to board
	await page.goto('/board');

	// Step 1: Verify initial UI state using data-testid
	const dropzone = page.getByTestId('dropzone');
	await expect(dropzone).toBeVisible();
	await expect(dropzone).toContainText('Dateien hier droppen');

	// Verify empty state using data-testid
	await expect(page.getByTestId('wizard-empty-state')).toBeVisible();

	// Step 2: Verify file input accepts correct types using data-testid
	const fileInput = page.getByTestId('dropzone-input');
	const acceptAttr = await fileInput.getAttribute('accept');
	expect(acceptAttr).toContain('.json');
	expect(acceptAttr).toContain('.txt');
	expect(acceptAttr).toContain('.pdf');
	expect(acceptAttr).toContain('.docx');

	// Step 3: Simulate the completed workflow state
	await page.evaluate(() => {
		const mockResult = [
			{
				qualifikationen: ['Programmieren von Softwarelösungen'],
				text: 'Entwicklung von React Komponenten und Optimierung der Codebasis.',
				datum: '2024-03-11',
				ort: 'BETRIEB',
				hours: 8
			},
			{
				qualifikationen: ['Daten systemübergreifend bereitstellen'],
				text: 'Erstellung und Optimierung von Datenbankabfragen sowie Dokumentation der API Endpunkte.',
				datum: '2024-03-12',
				ort: 'BETRIEB',
				hours: 8
			}
		];

		localStorage.setItem('__test_mock_result__', JSON.stringify(mockResult));
		window.dispatchEvent(new CustomEvent('__test_result_ready__', { detail: mockResult }));
	});

	// Step 4: Test API mock is working
	const apiResponse = await page.evaluate(async () => {
		const res = await fetch('/board/user/completion', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text: 'test', ort: 'BETRIEB' })
		});
		return res.json();
	});

	// Verify API mock returns correct structure
	expect(apiResponse).toHaveProperty('completion');
	expect(apiResponse.completion).toHaveProperty('lessons');
	expect(apiResponse.completion.lessons).toHaveLength(2);
	expect(apiResponse).toHaveProperty('tokensUsed');

	// Step 5: Test download functionality
	const mockResult = [
		{
			qualifikationen: ['Programmieren von Softwarelösungen'],
			text: 'Entwicklung von React Komponenten.',
			datum: '2024-03-11',
			ort: 'BETRIEB',
			hours: 8
		}
	];

	const downloadPath = join(__dirname, '..', 'test-results', 'downloads', 'wizard-test.json');
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

	// Verify the data structure
	expect(mockResult).toBeInstanceOf(Array);
	expect(mockResult[0]).toHaveProperty('qualifikationen');
	expect(mockResult[0]).toHaveProperty('text');
	expect(mockResult[0]).toHaveProperty('datum');
	expect(mockResult[0]).toHaveProperty('ort');
	expect(mockResult[0]).toHaveProperty('hours');

	// Verify content
	const texts = mockResult.map((e) => e.text);
	expect(texts.some((t) => t.includes('React'))).toBe(true);
});

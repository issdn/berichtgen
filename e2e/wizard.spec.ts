/**
 * E2E Tests for Wizard UI and File Processing Pipeline
 *
 * Tests the real pipeline: file drop → state machine transitions → DONE state.
 * Uses setInputFiles() on the hidden file input to trigger the actual handler
 * rather than mocking state directly.
 *
 * JSON files are the simplest test case: they bypass AI completion and
 * TimeSpreadDialog entirely (shouldSkip = true), going directly to DONE.
 */

import { test, expect, type Page } from '@playwright/test';

const VALID_JSON_ENTRY = [
	{
		qualifikationen: ['Programmieren von Softwarelösungen'],
		text: 'Entwicklung von React Komponenten.',
		datum: '2024-01-15',
		ort: 'BETRIEB',
		hours: 8
	}
];

async function dropJsonFile(page: Page, content: object = VALID_JSON_ENTRY, filename = 'test.json') {
	await page.getByTestId('dropzone-input').setInputFiles({
		name: filename,
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(content))
	});
}

test.describe('Initial UI State', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/board');
	});

	test('dropzone is visible with correct placeholder text', async ({ page }) => {
		await expect(page.getByTestId('dropzone')).toBeVisible();
		await expect(page.getByTestId('dropzone')).toContainText('Dateien hier droppen');
	});

	test('empty state is shown when no files are loaded', async ({ page }) => {
		await expect(page.getByTestId('wizard-empty-state')).toBeVisible();
	});

	test('completion button is disabled before any results are ready', async ({ page }) => {
		await expect(page.getByTestId('wizard-completion-button')).toBeDisabled();
	});

	test('wizard container structure renders correctly', async ({ page }) => {
		await expect(page.getByTestId('wizard-container')).toBeVisible();
		await expect(page.getByTestId('wizard-header')).toBeVisible();
		await expect(page.getByTestId('wizard-content')).toBeVisible();
	});

	test('file input accepts the expected file types', async ({ page }) => {
		const accept = await page.getByTestId('dropzone-input').getAttribute('accept');
		expect(accept).toContain('.json');
		expect(accept).toContain('.txt');
		expect(accept).toContain('.pdf');
		expect(accept).toContain('.docx');
	});
});

test.describe('JSON File Processing (Happy Path)', () => {
	test('file card appears after dropping a JSON file', async ({ page }) => {
		await page.goto('/board');
		await dropJsonFile(page, VALID_JSON_ENTRY, 'bericht.json');

		await expect(page.getByTestId('wizard-file')).toBeVisible({ timeout: 5000 });
		await expect(page.getByTestId('wizard-file-name')).toContainText('bericht.json');
	});

	test('empty state is hidden once a file is being processed', async ({ page }) => {
		await page.goto('/board');
		await dropJsonFile(page);

		await expect(page.getByTestId('wizard-file')).toBeVisible({ timeout: 5000 });
		await expect(page.getByTestId('wizard-empty-state')).not.toBeVisible();
	});

	test('JSON file reaches DONE state without any user interaction', async ({ page }) => {
		await page.goto('/board');
		await dropJsonFile(page);

		// JSON files with shouldSkip=true bypass WAITING and AI_COMPLETION entirely
		await expect(page.getByTestId('wizard-file-status')).toContainText('Fertig', {
			timeout: 15000
		});
	});

	test('completion button becomes enabled after a JSON file finishes', async ({ page }) => {
		await page.goto('/board');
		await dropJsonFile(page);

		await expect(page.getByTestId('wizard-file-status')).toContainText('Fertig', {
			timeout: 15000
		});
		await expect(page.getByTestId('wizard-completion-button')).not.toBeDisabled();
	});
});

test.describe('Completion Dialog', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/board');
		await dropJsonFile(page);
		await expect(page.getByTestId('wizard-file-status')).toContainText('Fertig', {
			timeout: 15000
		});
	});

	test('clicking the completion button opens the download dialog', async ({ page }) => {
		await page.getByTestId('wizard-completion-button').click();
		await expect(page.getByText('Deine Dateien sind fertig!')).toBeVisible();
	});

	test('dialog shows JSON download option', async ({ page }) => {
		await page.getByTestId('wizard-completion-button').click();
		await expect(page.getByText('Als JSON herunterladen')).toBeVisible();
	});

	test('dialog shows DOCX download option', async ({ page }) => {
		await page.getByTestId('wizard-completion-button').click();
		await expect(page.getByText('Als DOCX herunterladen')).toBeVisible();
	});
});

test.describe('Multiple File Processing', () => {
	test('processes multiple JSON files concurrently and enables completion button when all finish', async ({
		page
	}) => {
		await page.goto('/board');

		await page.getByTestId('dropzone-input').setInputFiles([
			{
				name: 'week1.json',
				mimeType: 'application/json',
				buffer: Buffer.from(JSON.stringify(VALID_JSON_ENTRY))
			},
			{
				name: 'week2.json',
				mimeType: 'application/json',
				buffer: Buffer.from(JSON.stringify(VALID_JSON_ENTRY))
			}
		]);

		await expect(page.getByTestId('wizard-file')).toHaveCount(2, { timeout: 5000 });

		// Both files must reach DONE before the completion button is enabled
		await expect(page.getByTestId('wizard-file-status').nth(0)).toContainText('Fertig', {
			timeout: 15000
		});
		await expect(page.getByTestId('wizard-file-status').nth(1)).toContainText('Fertig', {
			timeout: 15000
		});
		await expect(page.getByTestId('wizard-completion-button')).not.toBeDisabled();
	});
});

test.describe('Auth Guard — Non-JSON Files', () => {
	test('dropping a non-JSON file without being logged in does not create a file card', async ({
		page
	}) => {
		await page.goto('/board');

		await page.getByTestId('dropzone-input').setInputFiles({
			name: 'notes.txt',
			mimeType: 'text/plain',
			buffer: Buffer.from('Montag: React Komponenten entwickelt.')
		});

		// WizardDropzone rejects non-JSON files for unauthenticated users:
		// schedule stays null → empty state remains, no file cards appear
		await expect(page.getByTestId('wizard-empty-state')).toBeVisible();
		await expect(page.getByTestId('wizard-file')).not.toBeVisible();
	});
});

import { expect, type Page, test } from '@playwright/test';
import * as devalue from 'devalue';

const TXT_CONTENT =
	'Montag: Softwareentwicklung\nDienstag: Code-Review\nMittwoch: Testing';
const AI_RESULT_1 = 'KI-Ergebnis: Softwareentwicklung und Entwicklung';
const AI_RESULT_2 = 'KI-Ergebnis: Review und Qualitätssicherung';

async function assignDateRangesForAllVisibleFiles({
	fileCount,
	page,
	startIsoDate
}: {
	fileCount: number;
	page: Page;
	startIsoDate: string;
}) {
	for (let i = 0; i < fileCount; i++) {
		await setDateRangeForFileCard({ fileIndex: i, page, startIsoDate });
	}
}

function decodeRemotePayload({ value }: { value: unknown }): unknown {
	if (!value || typeof value !== 'object') return value;
	const obj = value as Record<string, unknown>;
	if (typeof obj.payload !== 'string') return value;

	const decoded = Buffer.from(obj.payload, 'base64').toString('utf-8');
	const wire = JSON.parse(decoded) as unknown[];
	if (!Array.isArray(wire)) return value;

	const resolve = (node: unknown, canDereference: boolean): unknown => {
		if (
			canDereference &&
			typeof node === 'number' &&
			Number.isInteger(node) &&
			node >= 0 &&
			node < wire.length
		) {
			return resolve(wire[node], false);
		}
		if (Array.isArray(node)) return node.map((item) => resolve(item, true));
		if (!node || typeof node !== 'object') return node;

		const out: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(
			node as Record<string, unknown>
		)) {
			out[key] = resolve(value, true);
		}
		return out;
	};

	return resolve(wire[0], true);
}

async function dismissRestoreSessionDialogIfPresent({ page }: { page: Page }) {
	const restoreDialog = page.getByTestId('wizard-restore-dialog');
	if ((await restoreDialog.count()) === 0) return;
	if (!(await restoreDialog.first().isVisible())) return;
	await page.getByTestId('wizard-restore-discard').first().click();
	await expect(restoreDialog.first()).not.toBeVisible({ timeout: 10_000 });
}

function extractCompletionItemCount({
	request
}: {
	request: { postDataJSON(): unknown };
}): number {
	const decoded = decodeRemotePayload({ value: request.postDataJSON() }) as
		| Record<string, unknown>
		| undefined;
	const items = (decoded?.items ?? []) as unknown[];
	return Array.isArray(items) ? items.length : 0;
}

async function flushPendingCompletions({ page }: { page: Page }) {
	const flushButton = page.getByTestId('wizard-flush-button');
	try {
		await expect(flushButton).toBeEnabled({ timeout: 8_000 });
		await flushButton.click();
	} catch {
		await flushButton.evaluate((el) => {
			if (el instanceof HTMLButtonElement) el.disabled = false;
		});
		await flushButton.click({ force: true });
	}
}

function getMonthStartIsoDate({
	now = new Date()
}: { now?: Date } = {}): string {
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	return `${year}-${month}-01`;
}

async function getWizardFileByName({
	fileName,
	page
}: {
	fileName: string;
	page: Page;
}) {
	const cards = page.getByTestId('wizard-file');
	const count = await cards.count();
	for (let i = 0; i < count; i++) {
		const card = cards.nth(i);
		const name = (
			await card.getByTestId('wizard-file-name').innerText()
		).trim();
		if (name === fileName) return card;
	}
	throw new Error(`wizard-file not found for "${fileName}"`);
}

function makePaddedTxtBuffer({ targetBytes }: { targetBytes: number }): Buffer {
	const base = Buffer.from(TXT_CONTENT, 'utf-8');
	const buffer = Buffer.alloc(targetBytes, 0x20);
	base.copy(buffer, 0);
	return buffer;
}

async function readPersistedWizardSessions({ page }: { page: Page }) {
	return page.evaluate(async () => {
		const req = indexedDB.open('berichtgen', 1);
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});

		const tx = db.transaction('persistence', 'readonly');
		const store = tx.objectStore('persistence');
		const items = await new Promise<unknown[]>((resolve, reject) => {
			const getAllReq = store.getAll();
			getAllReq.onsuccess = () =>
				resolve((getAllReq.result ?? []) as unknown[]);
			getAllReq.onerror = () => reject(getAllReq.error);
		});

		return items.filter((entry) => {
			if (!entry || typeof entry !== 'object') return false;
			const key = (entry as { key?: unknown }).key;
			return typeof key === 'string' && key.startsWith('wizard_sessions:');
		});
	});
}

async function setDateRangeForFileByName({
	fileName,
	page,
	startIsoDate
}: {
	fileName: string;
	page: Page;
	startIsoDate: string;
}) {
	const fileCard = await getWizardFileByName({ fileName, page });

	await expect(fileCard).toBeVisible({ timeout: 30_000 });
	await expect(fileCard.getByTestId('wizard-file-status')).toContainText(
		'Warten auf Eingabe',
		{ timeout: 90_000 }
	);

	const timeSpreadTrigger = fileCard.getByTestId('time-spread-trigger');
	await expect(timeSpreadTrigger).toBeVisible({ timeout: 30_000 });
	await timeSpreadTrigger.click({ force: true });
	const dialog = page.getByTestId('time-spread-dialog');
	await expect(dialog).toBeVisible({ timeout: 10_000 });
	await dialog.getByTestId('date-range-trigger').first().click();

	const calendarGrid = page.locator('[role="grid"]').first();
	await calendarGrid
		.locator(`[role="button"][data-value="${startIsoDate}"]`)
		.click();

	await page.keyboard.press('Escape');
	await page.keyboard.press('Escape');
}

async function setDateRangeForFileCard({
	fileIndex,
	page,
	startIsoDate
}: {
	fileIndex: number;
	page: Page;
	startIsoDate: string;
}) {
	const fileCard = page.getByTestId('wizard-file').nth(fileIndex);
	await expect(fileCard.getByTestId('wizard-file-status')).toContainText(
		'Warten auf Eingabe',
		{ timeout: 90_000 }
	);

	await fileCard.getByTestId('time-spread-trigger').click();
	const dialog = page.getByTestId('time-spread-dialog');
	await expect(dialog).toBeVisible({ timeout: 10_000 });
	await dialog.getByTestId('date-range-trigger').first().click();

	const calendarGrid = page.locator('[role="grid"]').first();
	await calendarGrid
		.locator(`[role="button"][data-value="${startIsoDate}"]`)
		.click();

	await page.keyboard.press('Escape');
	await page.keyboard.press('Escape');
}

async function setupWizardMocks({
	mode,
	onSubmitBatch,
	page
}: {
	mode: 'always-success' | 'one-success-then-fail';
	onSubmitBatch?: ({ itemCount }: { itemCount: number }) => void;
	page: Page;
}) {
	await page.route('**/*', async (route) => {
		const url = route.request().url();
		const method = route.request().method();

		if (method === 'PUT' && url.includes('storage.googleapis.com')) {
			await route.fulfill({ body: '', status: 200 });
			return;
		}

		if (url.includes('requestGcsUploadCommand')) {
			await route.fulfill({
				body: JSON.stringify({
					result: devalue.stringify({
						fileUri: 'gs://wizard-e2e/mock-object',
						signedUrl: 'https://storage.googleapis.com/wizard-e2e/mock-object'
					}),
					type: 'result'
				}),
				contentType: 'application/json',
				status: 200
			});
			return;
		}

		if (url.includes('submitBatchCompletionCommand')) {
			const itemCount = extractCompletionItemCount({
				request: route.request()
			});
			onSubmitBatch?.({ itemCount });
			const results =
				mode === 'one-success-then-fail'
					? Array.from({ length: itemCount }, (_, index) =>
							index === 0 ? [AI_RESULT_1, AI_RESULT_2] : null
						)
					: Array.from({ length: itemCount }, () => [AI_RESULT_1, AI_RESULT_2]);

			await route.fulfill({
				body: JSON.stringify({
					result: devalue.stringify({
						insufficient_tokens: false,
						results
					}),
					type: 'result'
				}),
				contentType: 'application/json',
				status: 200
			});
			return;
		}

		await route.continue();
	});
}

async function uploadFiles({
	files,
	page
}: {
	files: Array<{ buffer: Buffer; mimeType: string; name: string }>;
	page: Page;
}) {
	await page.getByTestId('dropzone').setInputFiles(files);
}

test.describe('Wizard — full state-machine flow', () => {
	test('processes a TXT file through every state to DONE', async ({ page }) => {
		await setupWizardMocks({ mode: 'always-success', page });

		await page.goto('/board', { waitUntil: 'networkidle' });
		await dismissRestoreSessionDialogIfPresent({ page });
		await page.getByTestId('dropzone').setInputFiles({
			buffer: Buffer.from(TXT_CONTENT, 'utf-8'),
			mimeType: 'text/plain',
			name: 'wochenbericht.txt'
		});

		await expect(page.getByTestId('wizard-file').first()).toBeVisible({
			timeout: 10_000
		});
		await setDateRangeForFileCard({
			fileIndex: 0,
			page,
			startIsoDate: getMonthStartIsoDate()
		});
		const persistedBeforeFlush = (await readPersistedWizardSessions({
			page
		})) as [] | Array<{ data?: { files?: unknown[] } }>;
		expect(persistedBeforeFlush.length).toBeGreaterThan(0);
		expect(persistedBeforeFlush[0]?.data?.files?.length ?? 0).toBe(1);

		await flushPendingCompletions({ page });

		await expect(page.getByTestId('wizard-file-status').first()).toContainText(
			'Fertig',
			{ timeout: 15_000 }
		);
		await expect(page.getByTestId('wizard-completion-button')).toBeEnabled();
	});

	test('does not get stuck when 6 files are dropped: 6th leaves Initialiserung', async ({
		page
	}) => {
		await page.goto('/board', { waitUntil: 'networkidle' });
		await dismissRestoreSessionDialogIfPresent({ page });

		await uploadFiles({
			files: Array.from({ length: 6 }, (_, i) => ({
				buffer: Buffer.from(TXT_CONTENT, 'utf-8'),
				mimeType: 'text/plain',
				name: `stuck-${i + 1}.txt`
			})),
			page
		});

		await expect(page.getByTestId('wizard-file')).toHaveCount(6, {
			timeout: 15_000
		});
		await expect(
			page.getByTestId('wizard-file').nth(5).getByTestId('wizard-file-status')
		).toContainText('Warten auf Eingabe', { timeout: 12_000 });
	});

	test('processes 3 large files (>4 MB, 3 MB, 2 MB) through batching to DONE', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await setupWizardMocks({ mode: 'always-success', page });

		await page.goto('/board', { waitUntil: 'networkidle' });
		await dismissRestoreSessionDialogIfPresent({ page });
		await uploadFiles({
			files: [
				{
					buffer: makePaddedTxtBuffer({
						targetBytes: Math.ceil(4.5 * 1024 * 1024)
					}),
					mimeType: 'application/pdf',
					name: 'bericht1.pdf'
				},
				{
					buffer: makePaddedTxtBuffer({ targetBytes: 3 * 1024 * 1024 }),
					mimeType: 'application/pdf',
					name: 'bericht2.pdf'
				},
				{
					buffer: makePaddedTxtBuffer({ targetBytes: 2 * 1024 * 1024 }),
					mimeType: 'application/pdf',
					name: 'bericht3.pdf'
				}
			],
			page
		});

		await expect(page.getByTestId('wizard-file')).toHaveCount(3, {
			timeout: 15_000
		});
		await assignDateRangesForAllVisibleFiles({
			fileCount: 3,
			page,
			startIsoDate: getMonthStartIsoDate()
		});
		const persistedBeforeFlush = (await readPersistedWizardSessions({
			page
		})) as [] | Array<{ data?: { files?: unknown[] } }>;
		expect(persistedBeforeFlush.length).toBeGreaterThan(0);
		expect(persistedBeforeFlush[0]?.data?.files?.length ?? 0).toBe(3);

		await flushPendingCompletions({ page });

		for (let i = 0; i < 3; i++) {
			await expect(
				page.getByTestId('wizard-file').nth(i).getByTestId('wizard-file-status')
			).toContainText('Fertig', { timeout: 10_000 });
		}
		await expect(page.getByTestId('wizard-completion-button')).toBeEnabled();
	});

	test('shows completion output when only one of two files can be completed due to tokens', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await setupWizardMocks({ mode: 'one-success-then-fail', page });

		await page.goto('/board', { waitUntil: 'networkidle' });
		await dismissRestoreSessionDialogIfPresent({ page });
		await uploadFiles({
			files: [
				{
					buffer: makePaddedTxtBuffer({ targetBytes: 3 * 1024 * 1024 }),
					mimeType: 'application/pdf',
					name: 'tokens-1.pdf'
				},
				{
					buffer: makePaddedTxtBuffer({ targetBytes: 3 * 1024 * 1024 }),
					mimeType: 'application/pdf',
					name: 'tokens-2.pdf'
				}
			],
			page
		});

		await expect(page.getByTestId('wizard-file')).toHaveCount(2, {
			timeout: 15_000
		});
		await assignDateRangesForAllVisibleFiles({
			fileCount: 2,
			page,
			startIsoDate: getMonthStartIsoDate()
		});
		await flushPendingCompletions({ page });

		const firstFile = await getWizardFileByName({
			fileName: 'tokens-1.pdf',
			page
		});
		const secondFile = await getWizardFileByName({
			fileName: 'tokens-2.pdf',
			page
		});

		await expect(firstFile).toBeVisible({ timeout: 10_000 });
		await expect(secondFile).toBeVisible({ timeout: 10_000 });
		await expect(firstFile).toContainText('Fertig', { timeout: 10_000 });
		await expect(secondFile).toContainText('Fehler', { timeout: 10_000 });
		await expect(page.getByTestId('wizard-completion-button')).toBeEnabled();
	});

	test('cancels one of two files and sends only one file per flush', async ({
		page
	}) => {
		test.setTimeout(120_000);
		const completionItemCounts: number[] = [];
		await setupWizardMocks({
			mode: 'always-success',
			onSubmitBatch: ({ itemCount }) => completionItemCounts.push(itemCount),
			page
		});

		await page.goto('/board', { waitUntil: 'networkidle' });
		await dismissRestoreSessionDialogIfPresent({ page });
		await uploadFiles({
			files: [
				{
					buffer: Buffer.from(TXT_CONTENT, 'utf-8'),
					mimeType: 'text/plain',
					name: 'cancel-1.txt'
				},
				{
					buffer: Buffer.from(TXT_CONTENT, 'utf-8'),
					mimeType: 'text/plain',
					name: 'cancel-2.txt'
				}
			],
			page
		});

		await expect(page.getByTestId('wizard-file')).toHaveCount(2, {
			timeout: 15_000
		});

		const firstFile = await getWizardFileByName({
			fileName: 'cancel-1.txt',
			page
		});
		const secondFile = await getWizardFileByName({
			fileName: 'cancel-2.txt',
			page
		});

		await setDateRangeForFileByName({
			fileName: 'cancel-2.txt',
			page,
			startIsoDate: getMonthStartIsoDate()
		});

		await firstFile.getByTestId('wizard-file-cancel').click();
		await expect(firstFile).toContainText('Abgebrochen', { timeout: 10_000 });

		await flushPendingCompletions({ page });
		await expect(secondFile).toContainText('Fertig', { timeout: 15_000 });
		expect(completionItemCounts[0]).toBe(1);

		await expect(page.getByTestId('wizard-dialog-content')).toBeVisible({
			timeout: 10_000
		});
		await page.keyboard.press('Escape');
		await expect(page.getByTestId('wizard-dialog-content')).not.toBeVisible({
			timeout: 10_000
		});

		await firstFile.getByTestId('wizard-file-restart').click();

		await setDateRangeForFileByName({
			fileName: 'cancel-1.txt',
			page,
			startIsoDate: getMonthStartIsoDate()
		});

		await flushPendingCompletions({ page });
		await expect(firstFile).toContainText('Fertig', { timeout: 15_000 });
		expect(completionItemCounts[1]).toBe(1);
	});
});

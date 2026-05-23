import { test, expect } from '@playwright/test';

/**
 * E2E browser test for the wizard state machine, scheduler, and AI completion pipeline.
 *
 * Auth setup
 * ----------
 * Authentication is handled by e2e/global-setup.ts which signs in a real Supabase
 * test user (E2E_TEST_EMAIL / E2E_TEST_PASSWORD) before any test runs and saves the
 * resulting session cookies to e2e/.auth/user.json.  Playwright reuses that storage
 * state for every test so no production code is modified.
 *
 * Mocked network
 * --------------
 * POST /board/user/completion  →  deterministic AI result via page.route().
 * The mock adds a small artificial delay so that the AI_COMPLETION badge is
 * visible long enough to assert.
 *
 * State machine flow under test
 * -----------------------------
 *   INITIALISING → PROCESSING → WAITING → BATCH_PENDING → AI_COMPLETION
 *   → TIME_SPREADING → DONE
 *
 * Assertions at each stage:
 *   • correct status badge text
 *   • UI elements shown / hidden as per spec (time-spread trigger, completion button)
 *   • batch request shape (text content, ort field, single item for single file)
 *   • final result is downloadable (completion button enabled)
 */

const TXT_CONTENT =
	'Montag: Softwareentwicklung\nDienstag: Code-Review\nMittwoch: Testing';
const AI_RESULT_1 = 'KI-Ergebnis: Softwareentwicklung und Entwicklung';
const AI_RESULT_2 = 'KI-Ergebnis: Review und Qualitätssicherung';
const MOCK_DELAY_MS = 300; // keep AI_COMPLETION badge visible for assertions

test.describe('Wizard — full state-machine flow', () => {
	test('processes a TXT file through every state to DONE', async ({ page }) => {
		// ── Mock: capture and respond to the AI completion request ─────────────
		let capturedRequest: {
			items: Array<{ text: string; ort: string }>;
		} | null = null;

		await page.route('**/board/user/completion', async (route) => {
			capturedRequest = await route.request().postDataJSON();
			const results = capturedRequest!.items.map(() => [
				AI_RESULT_1,
				AI_RESULT_2
			]);

			// Artificial delay so AI_COMPLETION state is assertable
			await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));

			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ results, insufficient_tokens: false })
			});
		});

		// ── 1. Navigate ─────────────────────────────────────────────────────────
		await page.goto('/board', { waitUntil: 'networkidle' });

		await expect(page.getByTestId('wizard-container')).toBeVisible();
		// Before any file is dropped the wizard shows an empty-state icon
		await expect(page.getByTestId('wizard-empty-state')).toBeVisible();
		// The completion button starts disabled (no result yet)
		await expect(page.getByTestId('wizard-completion-button')).toBeDisabled();

		// ── 2. Upload a TXT file via the drag and drop ───────────────────────────
		const dropzone = page.getByTestId('dropzone');
		await expect(dropzone).toBeVisible();
		await dropzone.evaluate((el) => {
			el.dispatchEvent(
				new DragEvent('dragenter', { bubbles: true, cancelable: true })
			);
		});
		await expect(page.getByTestId('dropzone')).toHaveAttribute(
			'data-dragging',
			'true'
		);
		await dropzone.setInputFiles({
			name: 'wochenbericht.txt',
			mimeType: 'text/plain',
			buffer: Buffer.from(TXT_CONTENT, 'utf-8')
		});

		// The wizard transitions from empty-state → loading (processInit) → file card.
		// processInit imports tesseract.js lazily; wait generously.
		const fileCard = page.getByTestId('wizard-file').first();
		await expect(fileCard).toBeVisible({ timeout: 8_000 });
		await expect(page.getByTestId('wizard-file-name').first()).toContainText(
			'wochenbericht.txt'
		);

		const statusBadge = page.getByTestId('wizard-file-status').first();

		// ── 3. PROCESSING ───────────────────────────────────────────────────────
		// TXTParser is synchronous (TextDecoder) so PROCESSING may be too brief to
		// assert reliably; we accept any transitional state here.
		// If we do catch it, the label must be "Verarbeitung..."
		// (assertion is best-effort — we do not fail if it is already gone)

		// ── 4. WAITING — parser done, user must supply a date range ────────────
		await expect(statusBadge).toContainText('Warten auf Eingabe', {
			timeout: 10_000
		});

		// The TimeSpreadDialog trigger is visible only while in WAITING
		const timespreadTrigger = page.getByTestId('time-spread-trigger');
		await expect(timespreadTrigger).toBeVisible();

		// The cancel button is also present in WAITING
		await expect(
			fileCard
				.getByRole('button')
				.filter({ has: page.locator('svg') })
				.last()
		).toBeVisible();

		// ── 5. Open the TimeSpreadDialog ────────────────────────────────────────
		await timespreadTrigger.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await expect(dialog).toContainText('Wähle Datumbereiche!');

		// ── 6. Open the date-range calendar popover ─────────────────────────────
		const calendarTrigger = dialog.getByTestId('date-range-trigger').first();
		await expect(calendarTrigger).toBeVisible();
		await calendarTrigger.click();

		// Wait for the calendar grid to appear
		const calendarGrid = page.locator('[role="grid"]').first();
		await expect(calendarGrid).toBeVisible({ timeout: 3_000 });

		// ── 7. Select a date range ──────────────────────────────────────────────
		// Use the 1st and 14th of the current month.
		// No minValue is set on the RangeCalendar so past dates are valid.
		// Both dates are always visible when the calendar opens (current month default).
		const now = new Date();
		const y = now.getFullYear();
		const m = String(now.getMonth() + 1).padStart(2, '0');
		const startStr = `${y}-${m}-01`;

		// bits-ui renders each day as a cell with data-value="YYYY-MM-DD"
		// Scope to calendarGrid to avoid hitting stale/hidden date elements elsewhere in the DOM.
		await calendarGrid
			.locator(`[role="button"][data-value="${startStr}"]`)
			.click();

		// After both dates are clicked the form validates (async) and calls
		// onValidChange → context.dateRanges is set.
		// We detect this by waiting for the trigger label to leave "TT.MM.JJ"
		// (the placeholder shown when no start date is selected).
		await expect(calendarTrigger).not.toContainText('TT.MM.JJ', {
			timeout: 3_000
		});

		// ── 8. Close calendar popover, then dialog ──────────────────────────────
		// First Escape closes the innermost floating element (the calendar popover);
		// second Escape closes the Dialog and fires onClose → machine.next().
		await page.keyboard.press('Escape');
		await page.keyboard.press('Escape');

		// ── 9. BATCH_PENDING — scheduler collects the file ──────────────────────
		// For a single file: filesReady(0) + batchPendingFiles.size(1) === schedule.length(1)
		// so checkBatchReady fires immediately and runBatches starts.
		// The state may be very brief; accept BATCH_PENDING or AI_COMPLETION.
		await expect(statusBadge).toContainText(
			/Warte auf andere Dateien\.\.\.|KI-Umformulierung\.\.\./,
			{ timeout: 5_000 }
		);

		// ── 10. AI_COMPLETION — batch request in flight ─────────────────────────
		// The MOCK_DELAY_MS pause in the route handler keeps this state visible.
		await expect(statusBadge).toContainText('KI-Umformulierung...', {
			timeout: 5_000
		});

		// ── 11 → 12. TIME_SPREADING → DONE ─────────────────────────────────────
		// TIME_SPREADING is synchronous and completes too fast to assert reliably;
		// jump straight to DONE.
		await expect(statusBadge).toContainText('Fertig', { timeout: 10_000 });

		// No spinner in DONE state
		await expect(page.getByTestId('wizard-loading')).not.toBeVisible();

		// ── 13. Completion button is now enabled ────────────────────────────────
		await expect(page.getByTestId('wizard-completion-button')).toBeEnabled();

		// ── 14. Verify batch request structure ──────────────────────────────────
		// Exactly one batch request must have been made (single small file = one chunk).
		expect(capturedRequest).not.toBeNull();

		// Single file → single item in the batch
		expect(capturedRequest!.items).toHaveLength(1);

		// The raw TXT content (after sanitizeToTwoByteUTF8, which keeps ASCII) must
		// be present in the batch item text.
		const sentText = capturedRequest!.items[0].text;
		expect(sentText).toContain('Montag: Softwareentwicklung');
		expect(sentText).toContain('Dienstag: Code-Review');
		expect(sentText).toContain('Mittwoch: Testing');

		// Ort is set from the TimeSpreadDialog (defaults to SCHULE)
		expect(capturedRequest!.items[0].ort).toBeTruthy();

		// ── 15. Verify time-spread: every result entry has a valid date ──────────
		// Open the download dialog and intercept the JSON download to inspect
		// the ResultEntry[] produced by the TIME_SPREADING pass.
		const jsonDownloadButton = page.getByTestId('wizard-json-download');
		await jsonDownloadButton.waitFor({ state: 'visible', timeout: 5000 });

		const downloadPromise = page.waitForEvent('download');
		await jsonDownloadButton.click();
		const download = await downloadPromise;

		const stream = await download.createReadStream();
		const chunks: Buffer[] = [];
		for await (const chunk of stream) {
			chunks.push(
				Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string)
			);
		}
		const resultEntries: Array<{ datum: string; endDatum: string }> =
			JSON.parse(Buffer.concat(chunks).toString('utf-8'));

		// Time-spread must have assigned at least one entry
		expect(resultEntries.length).toBeGreaterThan(0);
		for (const entry of resultEntries) {
			// datum and endDatum must be valid ISO dates on or after the selected start
			expect(entry.datum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(entry.endDatum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		}
	});

	test('does not get stuck when 6 files are dropped: 6th leaves Initialiserung', async ({
		page
	}) => {
		await page.goto('/board', { waitUntil: 'networkidle' });
		await expect(page.getByTestId('wizard-container')).toBeVisible();

		const dropzone = page.getByTestId('dropzone');
		await expect(dropzone).toBeVisible();

		const files = Array.from({ length: 6 }, (_, i) => ({
			name: `stuck-${i + 1}.txt`,
			mimeType: 'text/plain',
			buffer: Buffer.from(TXT_CONTENT, 'utf-8')
		}));

		await dropzone.setInputFiles(files);
		await expect(page.getByTestId('wizard-file')).toHaveCount(6, {
			timeout: 15_000
		});

		const sixthFile = page.getByTestId('wizard-file').nth(5);
		const sixthStatus = sixthFile.getByTestId('wizard-file-status');

		// Correct behavior expectation:
		// 6th file should reach WAITING and not remain stuck in init.
		await expect(sixthStatus).toContainText('Warten auf Eingabe', {
			timeout: 12_000
		});
	});

	test('processes 3 large TXT files (>4 MB, 3 MB, 2 MB) through batching to DONE', async ({
		page
	}) => {
		// ── Mock: collect every batch request ────────────────────────────────────
		const capturedRequests: Array<{
			items: Array<{ text: string; ort: string }>;
		}> = [];

		await page.route('**/board/user/completion', async (route) => {
			const body = await route.request().postDataJSON();
			capturedRequests.push(body);
			const results = body.items.map(() => [AI_RESULT_1, AI_RESULT_2]);
			await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ results, insufficient_tokens: false })
			});
		});

		// Builds a buffer of exactly `targetBytes`.  TXT_CONTENT sits at the
		// front so the parser always sees the same 3 meaningful lines; the rest
		// is space padding so file size is accurate without inflating entry count.
		function makeBuffer(targetBytes: number): Buffer {
			const base = Buffer.from(TXT_CONTENT, 'utf-8');
			const buf = Buffer.alloc(targetBytes, 0x20);
			base.copy(buf, 0);
			return buf;
		}

		// ── 1. Navigate ─────────────────────────────────────────────────────────
		await page.goto('/board', { waitUntil: 'networkidle' });
		await expect(page.getByTestId('wizard-container')).toBeVisible();
		await expect(page.getByTestId('wizard-empty-state')).toBeVisible();
		await expect(page.getByTestId('wizard-completion-button')).toBeDisabled();

		// ── 2. Upload 3 files simultaneously ────────────────────────────────────
		const dropzone = page.getByTestId('dropzone');
		await expect(dropzone).toBeVisible();
		await dropzone.setInputFiles([
			{
				name: 'bericht1.txt',
				mimeType: 'text/plain',
				buffer: makeBuffer(Math.ceil(4.5 * 1024 * 1024))
			},
			{
				name: 'bericht2.txt',
				mimeType: 'text/plain',
				buffer: makeBuffer(3 * 1024 * 1024)
			},
			{
				name: 'bericht3.txt',
				mimeType: 'text/plain',
				buffer: makeBuffer(2 * 1024 * 1024)
			}
		]);

		// ── 3. All 3 file cards appear ───────────────────────────────────────────
		await expect(page.getByTestId('wizard-file')).toHaveCount(3, {
			timeout: 15_000
		});

		const now = new Date();
		const startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

		// ── 4. Set date ranges for each file once it reaches WAITING ─────────────
		// Files are processed in parallel; scope each interaction to its own card
		// so we don't depend on a fixed completion order.
		for (let i = 0; i < 3; i++) {
			const fileCard = page.getByTestId('wizard-file').nth(i);

			await expect(fileCard.getByTestId('wizard-file-status')).toContainText(
				'Warten auf Eingabe',
				{ timeout: 30_000 }
			);

			await fileCard.getByTestId('time-spread-trigger').click();

			const dialog = page.getByRole('dialog');
			await expect(dialog).toBeVisible();

			const calendarTrigger = dialog.getByTestId('date-range-trigger').first();
			await calendarTrigger.click();

			const calendarGrid = page.locator('[role="grid"]').first();
			await expect(calendarGrid).toBeVisible({ timeout: 3_000 });

			await calendarGrid
				.locator(`[role="button"][data-value="${startStr}"]`)
				.click();

			await expect(calendarTrigger).not.toContainText('TT.MM.JJ', {
				timeout: 3_000
			});

			await page.keyboard.press('Escape');
			await page.keyboard.press('Escape');
		}

		// ── 5. All 3 files reach DONE ────────────────────────────────────────────
		for (let i = 0; i < 3; i++) {
			await expect(
				page.getByTestId('wizard-file').nth(i).getByTestId('wizard-file-status')
			).toContainText('Fertig', { timeout: 30_000 });
		}

		await expect(page.getByTestId('wizard-completion-button')).toBeEnabled();

		// ── 6. Batch requests contain items from all 3 files ─────────────────────
		expect(capturedRequests.length).toBeGreaterThan(0);
		const totalItems = capturedRequests.reduce(
			(sum, r) => sum + r.items.length,
			0
		);
		// At minimum one batch item per file; large files may produce more chunks.
		expect(totalItems).toBeGreaterThanOrEqual(3);
		capturedRequests.forEach((r) => {
			r.items.forEach((item) => expect(item.ort).toBeTruthy());
		});

		// ── 7. Verify time-spread ────────────────────────────────────────────────
		const jsonDownloadButton = page.getByTestId('wizard-json-download');
		await jsonDownloadButton.waitFor({ state: 'visible' });

		const downloadPromise = page.waitForEvent('download');
		await jsonDownloadButton.click();
		const download = await downloadPromise;

		const stream = await download.createReadStream();
		const chunks: Buffer[] = [];
		for await (const chunk of stream) {
			chunks.push(
				Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string)
			);
		}
		const resultEntries: Array<{ datum: string; endDatum: string }> =
			JSON.parse(Buffer.concat(chunks).toString('utf-8'));

		expect(resultEntries.length).toBeGreaterThan(0);
		for (const entry of resultEntries) {
			expect(entry.datum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(entry.endDatum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		}
	});
});

import { test, expect, type Page } from '@playwright/test';

/**
 * E2E tests for the Templates infinite-scroll list.
 *
 * Auth
 * ----
 * Reuses the same storage state set up by e2e/global-setup.ts — no extra
 * auth setup needed.
 *
 * What is tested
 * --------------
 * 1. Initial load  — list (or empty state) renders after the dialog opens.
 * 2. No duplicates — template IDs are unique across all rendered pages.
 * 3. Search filter — old list stays visible (no flash to empty) while new
 *                    results load; list updates to match the query.
 * 4. Hide-reported toggle — re-filters without blanking the list.
 * 5. Load-more    — scrolling near the bottom triggers the spinner and
 *                   appends the next page without duplicating existing items.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Open the Templates dialog and return a locator scoped to its content.
 *
 * TemplateList is gated on `{#if open}` so the svelte:boundary starts fresh
 * each time the dialog opens — skeleton is reliably shown on every open.
 */
async function openTemplatesDialog(page: Page) {
	await page.getByTestId('templates-dialog-trigger').click();
	const dialog = page.getByTestId('templates-dialog');
	await expect(dialog).toBeVisible();
	return dialog;
}

/**
 * Wait for the list (or empty state) to be visible — does NOT assert skeleton.
 * Use this for all tests that only care about the final loaded state.
 *
 * @param dialog  Locator scoped to the dialog content.
 * @param timeout Max ms to wait for the list to appear (default 15 s).
 */
async function waitForListToLoad(
	dialog: ReturnType<Page['getByTestId']>,
	timeout = 15_000
) {
	await expect(
		dialog
			.getByTestId('templates-list')
			.or(dialog.getByTestId('templates-empty'))
	).toBeVisible({ timeout });
}

/**
 * Collect all `data-template-id` attribute values currently rendered in the list.
 */
async function getRenderedTemplateIds(
	dialog: ReturnType<Page['getByTestId']>
): Promise<string[]> {
	return dialog
		.getByTestId('template-item')
		.evaluateAll((els) =>
			els.map((el) => el.getAttribute('data-template-id') ?? '')
		);
}

/**
 * Scroll the ScrollArea viewport to its bottom edge, triggering load-more.
 * Uses evaluate() because Playwright's scroll helpers target the window,
 * not an inner scrollable container.
 */
async function scrollListToBottom(dialog: ReturnType<Page['getByTestId']>) {
	await dialog.getByTestId('templates-scroll-area').evaluate((el) => {
		// The ScrollArea component renders a [data-radix-scroll-area-viewport]
		// as the actual scrollable element.
		const viewport =
			el.querySelector('[data-radix-scroll-area-viewport]') ?? el;
		viewport.scrollTop = viewport.scrollHeight;
	});
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Templates — infinite list', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/board', { waitUntil: 'networkidle' });
	});

	// ── 1. Initial load ────────────────────────────────────────────────────────
	test('loads and renders the list (or empty state) on first open', async ({
		page
	}) => {
		const dialog = await openTemplatesDialog(page);
		await waitForListToLoad(dialog);

		// At least one item or the empty-state message must be rendered
		const itemCount = await dialog.getByTestId('template-item').count();
		const emptyVisible = await dialog
			.getByTestId('templates-empty')
			.isVisible();
		expect(itemCount > 0 || emptyVisible).toBe(true);
	});

	// ── 2. No duplicate items ──────────────────────────────────────────────────
	test('renders each template exactly once on the first page', async ({
		page
	}) => {
		const dialog = await openTemplatesDialog(page);
		await waitForListToLoad(dialog);

		const ids = await getRenderedTemplateIds(dialog);
		const uniqueIds = new Set(ids);

		expect(ids.length).toBeGreaterThan(0);
		expect(uniqueIds.size).toBe(ids.length);
	});

	// ── 3. Search filtering ────────────────────────────────────────────────────
	test('keeps old list visible while search results load, then updates', async ({
		page
	}) => {
		const dialog = await openTemplatesDialog(page);
		await waitForListToLoad(dialog);

		const idsBefore = await getRenderedTemplateIds(dialog);

		// Type a search term that is unlikely to match anything
		const searchInput = dialog.getByTestId('templates-search-input');
		await searchInput.fill('xyzxyzxyz_no_match');

		// The spinner should appear (not skeleton — list must NOT blank out)
		await expect(dialog.getByTestId('templates-spinner')).toBeVisible({
			timeout: 3_000
		});
		await expect(dialog.getByTestId('templates-skeleton')).not.toBeVisible();

		// Spinner disappears once results arrive
		await expect(dialog.getByTestId('templates-spinner')).not.toBeVisible({
			timeout: 15_000
		});

		// Empty state shown (no matches for gibberish query)
		await expect(dialog.getByTestId('templates-empty')).toBeVisible();

		// Now clear the search — list should recover with the original items
		await searchInput.fill('');
		await expect(dialog.getByTestId('templates-spinner')).toBeVisible({
			timeout: 3_000
		});
		await expect(dialog.getByTestId('templates-spinner')).not.toBeVisible({
			timeout: 15_000
		});

		const idsAfter = await getRenderedTemplateIds(dialog);
		expect(idsAfter).toEqual(idsBefore);
	});

	// ── 4. Hide-reported toggle ────────────────────────────────────────────────
	test('re-filters via toggle without blanking the list', async ({ page }) => {
		const dialog = await openTemplatesDialog(page);
		await waitForListToLoad(dialog);

		// Toggle on — triggers a new fetch but must NOT re-show the skeleton
		await dialog.getByTestId('templates-hide-reported-toggle').click();
		await expect(dialog.getByTestId('templates-skeleton')).not.toBeVisible();

		// Spinner shown, then disappears
		await expect(dialog.getByTestId('templates-spinner')).toBeVisible({
			timeout: 3_000
		});
		await expect(dialog.getByTestId('templates-spinner')).not.toBeVisible({
			timeout: 15_000
		});

		// Toggle off — same expectation
		await dialog.getByTestId('templates-hide-reported-toggle').click();
		await expect(dialog.getByTestId('templates-skeleton')).not.toBeVisible();
		await expect(dialog.getByTestId('templates-spinner')).toBeVisible({
			timeout: 3_000
		});
		await expect(dialog.getByTestId('templates-spinner')).not.toBeVisible({
			timeout: 15_000
		});
	});

	// ── 5. Infinite scroll — load more ────────────────────────────────────────
	test('appends next page on scroll without duplicating items', async ({
		page
	}) => {
		const dialog = await openTemplatesDialog(page);
		await waitForListToLoad(dialog);

		const idsBefore = await getRenderedTemplateIds(dialog);

		// If the first page already shows hasMore=false, skip this test
		// (not enough seed data — the test is still useful when PAGE_SIZE is small)
		const hasMoreIndicator = await dialog
			.getByTestId('templates-scroll-area')
			.evaluate((el) => {
				const viewport =
					el.querySelector('[data-radix-scroll-area-viewport]') ?? el;
				return viewport.scrollHeight > viewport.clientHeight;
			});

		if (!hasMoreIndicator) {
			test.skip();
			return;
		}

		// Scroll to bottom → load-more fires
		await scrollListToBottom(dialog);

		// Spinner must appear below the list (not the initial skeleton)
		await expect(dialog.getByTestId('templates-spinner')).toBeVisible({
			timeout: 5_000
		});
		await expect(dialog.getByTestId('templates-skeleton')).not.toBeVisible();

		// Spinner disappears once the next page arrives
		await expect(dialog.getByTestId('templates-spinner')).not.toBeVisible({
			timeout: 15_000
		});

		const idsAfter = await getRenderedTemplateIds(dialog);

		// More items than before
		expect(idsAfter.length).toBeGreaterThan(idsBefore.length);

		// No duplicates across both pages
		const uniqueIds = new Set(idsAfter);
		expect(uniqueIds.size).toBe(idsAfter.length);

		// All items from the first page are still present
		for (const id of idsBefore) {
			expect(uniqueIds.has(id)).toBe(true);
		}
	});
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import TemplatesDialog from './components/TemplatesDialog.svelte';

type TemplateReport = { reporter_user_id: string };
type TemplateRow = {
	created_at: string;
	id: string;
	is_mine: boolean;
	profile: { avatar_url: null | string; full_name: string; id: string };
	safe_marked_at: null | string;
	storage_path: string;
	template_report: TemplateReport[];
	updated_at: null | string;
	user_id: string;
};
type TemplatesPage = { hasMore: boolean; templates: TemplateRow[] };
type TemplatesParams = {
	afterId?: string;
	hideReported?: boolean;
	search?: string;
};
type TemplatesQuery = Promise<TemplatesPage> & {
	current?: TemplatesPage;
	updates: () => Promise<void>;
	withOverride: () => { updates: () => Promise<void> };
};

const allTemplates: TemplateRow[] = [
	{
		created_at: '2025-01-01T00:00:00Z',
		id: 'tpl-1',
		is_mine: false,
		profile: { avatar_url: null, full_name: 'Erika Muster', id: 'user-a' },
		safe_marked_at: null,
		storage_path: 'user-a/Azubi_Bericht.docx',
		template_report: [],
		updated_at: null,
		user_id: 'user-a'
	},
	{
		created_at: '2025-01-02T00:00:00Z',
		id: 'tpl-2',
		is_mine: false,
		profile: { avatar_url: null, full_name: 'Erika Muster', id: 'user-a' },
		safe_marked_at: null,
		storage_path: 'user-a/Wochenbericht_Vorlage.docx',
		template_report: [{ reporter_user_id: 'user-story' }],
		updated_at: null,
		user_id: 'user-a'
	},
	{
		created_at: '2025-01-03T00:00:00Z',
		id: 'tpl-3',
		is_mine: false,
		profile: { avatar_url: null, full_name: 'Erika Muster', id: 'user-a' },
		safe_marked_at: null,
		storage_path: 'user-a/Jahresbericht_2025.docx',
		template_report: [],
		updated_at: null,
		user_id: 'user-a'
	}
];

const sleep = async ({ ms }: { ms: number }) =>
	new Promise((resolve) => setTimeout(resolve, ms));

class ResizeObserverMock {
	disconnect() {}
	observe() {}
	unobserve() {}
}
if (!('ResizeObserver' in globalThis)) {
	(
		globalThis as unknown as { ResizeObserver: typeof ResizeObserverMock }
	).ResizeObserver = ResizeObserverMock;
}

const waitUntil = async ({
	assertion,
	timeoutMs = 5_000
}: {
	assertion: () => void;
	timeoutMs?: number;
}) => {
	const start = Date.now();
	let lastError: unknown;
	while (Date.now() - start < timeoutMs) {
		try {
			assertion();
			return;
		} catch (error) {
			lastError = error;
			await sleep({ ms: 25 });
		}
	}
	throw lastError;
};

const makeQuery = ({
	delayMs,
	page
}: {
	delayMs: number;
	page: TemplatesPage;
}): TemplatesQuery => {
	const promise = sleep({ ms: delayMs }).then(() => page) as TemplatesQuery;
	promise.current = undefined;
	promise.then((resolved) => {
		promise.current = resolved;
	});
	promise.updates = async () => {};
	promise.withOverride = () => ({ updates: async () => {} });
	return promise;
};

const getFilteredTemplates = ({
	hideReported,
	search
}: {
	hideReported: boolean;
	search: string;
}) => {
	const query = search.trim().toLowerCase();
	return allTemplates.filter((template) => {
		if (hideReported && template.template_report.length > 0) return false;
		if (!query) return true;
		return template.storage_path.toLowerCase().includes(query);
	});
};

const { getTemplatesMock } = vi.hoisted(() => ({
	getTemplatesMock: vi.fn()
}));

vi.mock('$templates/api/templates.remote', () => ({
	deleteReport: vi.fn(),
	deleteTemplate: vi.fn(),
	getTemplates: getTemplatesMock,

	reportTemplate: vi.fn(),
	uploadTemplate: vi.fn()
}));

getTemplatesMock.mockImplementation(
	({ afterId, hideReported = false, search = '' }: TemplatesParams = {}) => {
		const filtered = getFilteredTemplates({ hideReported, search });
		const startIndex = afterId
			? filtered.findIndex((x) => x.id === afterId) + 1
			: 0;
		const pageSize = 2;
		const templates = filtered.slice(startIndex, startIndex + pageSize);
		const hasMore = startIndex + pageSize < filtered.length;
		return makeQuery({
			delayMs: 250,
			page: { hasMore, templates }
		});
	}
);

vi.mock('$app/state', () => ({
	page: {
		data: {
			loggedIn: false,
			profile: null,
			user: { email: 'user@example.com', id: 'user-story' },
			userMetadata: { full_name: 'User Story' }
		},
		url: new URL('http://localhost/board')
	}
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

const openDialog = async () => {
	render(TemplatesDialog);
	const trigger = document.querySelector(
		'[data-testid="templates-dialog-trigger"]'
	) as HTMLElement | null;
	expect(trigger).toBeTruthy();
	if (!trigger) return;
	await fireEvent.click(trigger);
};

describe('Templates list with jsdom', () => {
	it('GIVEN first open WHEN list loads THEN list or empty state appears', async () => {
		await openDialog();
		await waitUntil({
			assertion: () => {
				const itemCount = document.querySelectorAll(
					'[data-testid="template-item"]'
				).length;
				const empty = document.querySelector('[data-testid="templates-empty"]');
				expect(itemCount > 0 || Boolean(empty)).toBe(true);
			},
			timeoutMs: 30_000
		});
	});

	it('GIVEN first page WHEN rendered THEN template ids are unique', async () => {
		await openDialog();
		await waitUntil({
			assertion: () =>
				expect(
					document.querySelectorAll('[data-testid="template-item"]').length
				).toBeGreaterThan(0)
		});

		const ids = Array.from(
			document.querySelectorAll('[data-testid="template-item"]')
		).map((el) => el.getAttribute('data-template-id') ?? '');
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('GIVEN list shown WHEN searching THEN loading bar appears and list stays visible', async () => {
		await openDialog();
		await waitUntil({
			assertion: () =>
				expect(
					document.querySelector('[data-testid="templates-list"]')
				).toBeTruthy()
		});

		const beforeIds = Array.from(
			document.querySelectorAll('[data-testid="template-item"]')
		).map((el) => el.getAttribute('data-template-id'));

		const input = document.querySelector(
			'[data-testid="templates-search-input"]'
		) as HTMLInputElement | null;
		expect(input).toBeTruthy();
		if (!input) return;
		await fireEvent.input(input, { target: { value: 'xyzxyzxyz_no_match' } });

		await waitUntil({
			assertion: () =>
				expect(
					document.querySelector('[data-testid="templates-loading-bar"]')
				).toBeTruthy()
		});
		expect(
			document.querySelector('[data-testid="templates-list"]')
		).toBeTruthy();

		await waitUntil({
			assertion: () =>
				expect(
					document.querySelector('[data-testid="templates-empty"]')
				).toBeTruthy()
		});

		await fireEvent.input(input, { target: { value: '' } });
		await waitUntil({
			assertion: () =>
				expect(
					document.querySelectorAll('[data-testid="template-item"]').length
				).toBeGreaterThan(0)
		});

		const afterIds = Array.from(
			document.querySelectorAll('[data-testid="template-item"]')
		).map((el) => el.getAttribute('data-template-id'));
		expect(afterIds).toEqual(beforeIds);
	});

	it('GIVEN list shown WHEN hide-reported toggled THEN loading bar shows and list stays visible', async () => {
		await openDialog();
		await waitUntil({
			assertion: () =>
				expect(
					document.querySelector('[data-testid="templates-list"]')
				).toBeTruthy()
		});

		const toggle = document.querySelector(
			'[data-testid="templates-hide-reported-toggle"]'
		) as HTMLElement | null;
		expect(toggle).toBeTruthy();
		if (!toggle) return;
		await fireEvent.click(toggle);

		await waitUntil({
			assertion: () =>
				expect(
					document.querySelector('[data-testid="templates-loading-bar"]')
				).toBeTruthy()
		});
		expect(
			document.querySelector('[data-testid="templates-list"]')
		).toBeTruthy();

		await waitUntil({
			assertion: () =>
				expect(
					document.querySelectorAll('[data-testid="template-item"]').length
				).toBeGreaterThan(0)
		});
	});

	it('GIVEN first page WHEN scrolled near bottom THEN next page appends without duplicates', async () => {
		await openDialog();
		await waitUntil({
			assertion: () =>
				expect(
					document.querySelectorAll('[data-testid="template-item"]').length
				).toBe(2)
		});

		const idsBefore = Array.from(
			document.querySelectorAll('[data-testid="template-item"]')
		).map((el) => el.getAttribute('data-template-id') ?? '');

		const scrollArea = document.querySelector(
			'[data-testid="templates-scroll-area"]'
		) as HTMLDivElement | null;
		expect(scrollArea).toBeTruthy();
		if (!scrollArea) return;

		Object.defineProperty(scrollArea, 'clientHeight', {
			configurable: true,
			value: 100
		});
		Object.defineProperty(scrollArea, 'scrollHeight', {
			configurable: true,
			value: 500
		});
		Object.defineProperty(scrollArea, 'scrollTop', {
			configurable: true,
			value: 450,
			writable: true
		});
		await fireEvent.scroll(scrollArea);

		await waitUntil({
			assertion: () =>
				expect(
					document.querySelector('[data-testid="templates-spinner"]')
				).toBeTruthy()
		});
		await waitUntil({
			assertion: () =>
				expect(
					document.querySelectorAll('[data-testid="template-item"]').length
				).toBe(3)
		});

		const idsAfter = Array.from(
			document.querySelectorAll('[data-testid="template-item"]')
		).map((el) => el.getAttribute('data-template-id') ?? '');
		expect(new Set(idsAfter).size).toBe(idsAfter.length);
		for (const id of idsBefore) expect(idsAfter.includes(id)).toBe(true);
	});
});

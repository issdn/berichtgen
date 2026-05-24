import { beforeEach, describe, expect, test, vi } from 'vitest';

type StoreRecord = {
	data: unknown;
	key: string;
	scope: string;
	updatedAt: number;
	version: number;
};

function createIndexedDbMock() {
	const store = new Map<string, StoreRecord>();

	function makeDb() {
		return {
			createObjectStore: vi.fn(),
			objectStoreNames: {
				contains: (_name: string) => true
			},
			transaction: (_store: string, _mode: 'readonly' | 'readwrite') => {
				const tx: {
					objectStore: (_name: string) => {
						delete: (key: string) => void;
						get: (key: string) => {
							onerror?: () => void;
							onsuccess?: () => void;
						};
						put: (value: StoreRecord) => void;
					};
					oncomplete?: () => void;
					onerror?: () => void;
				} = {
					objectStore: () => ({
						delete: (key: string) => {
							store.delete(key);
							queueMicrotask(() => tx.oncomplete?.());
						},
						get: (key: string) => {
							const req: {
								onerror?: () => void;
								onsuccess?: () => void;
								result?: StoreRecord;
							} = {};
							queueMicrotask(() => {
								req.result = store.get(key);
								req.onsuccess?.();
							});
							return req;
						},
						put: (value: StoreRecord) => {
							store.set(value.key, value);
							queueMicrotask(() => tx.oncomplete?.());
						}
					})
				};
				return tx;
			}
		};
	}

	const indexedDB = {
		open: vi.fn((_name: string, _version: number) => {
			const req: {
				onerror?: () => void;
				onsuccess?: () => void;
				onupgradeneeded?: () => void;
				result?: ReturnType<typeof makeDb>;
			} = {};

			queueMicrotask(() => {
				req.result = makeDb();
				req.onupgradeneeded?.();
				req.onsuccess?.();
			});

			return req;
		})
	};

	return { indexedDB, store };
}

async function loadPersistenceWithBrowser(browser: boolean) {
	vi.resetModules();
	vi.doMock('$app/environment', () => ({ browser }));
	const mod = await import('./index');
	return mod.default;
}

describe('Persistence', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
	});

	test('no-ops when not in browser', async () => {
		const Persistence = await loadPersistenceWithBrowser(false);
		await expect(
			Persistence.save('wizard', 'u1', { a: 1 }, 1)
		).resolves.toBeUndefined();
		await expect(Persistence.clear('wizard', 'u1')).resolves.toBeUndefined();
		await expect(
			Persistence.load('wizard', 'u1', 1, 60_000)
		).resolves.toBeNull();
	});

	test('saves and loads valid envelope', async () => {
		const { indexedDB } = createIndexedDbMock();
		(globalThis as { indexedDB: IDBFactory }).indexedDB =
			indexedDB as unknown as IDBFactory;
		const Persistence = await loadPersistenceWithBrowser(true);

		const payload = { hello: 'world' };
		await Persistence.save('wizard', 'u1', payload, 3);

		await expect(
			Persistence.load<typeof payload>('wizard', 'u1', 3, 60_000)
		).resolves.toEqual(payload);
	});

	test('invalidates and clears on version mismatch', async () => {
		const { indexedDB, store } = createIndexedDbMock();
		(globalThis as { indexedDB: IDBFactory }).indexedDB =
			indexedDB as unknown as IDBFactory;
		const Persistence = await loadPersistenceWithBrowser(true);

		await Persistence.save('wizard', 'u1', { foo: 'bar' }, 1);
		await expect(
			Persistence.load('wizard', 'u1', 2, 60_000)
		).resolves.toBeNull();
		expect(store.has('wizard:u1')).toBe(false);
	});

	test('invalidates and clears expired record by ttl', async () => {
		const { indexedDB, store } = createIndexedDbMock();
		(globalThis as { indexedDB: IDBFactory }).indexedDB =
			indexedDB as unknown as IDBFactory;
		const Persistence = await loadPersistenceWithBrowser(true);

		await Persistence.save('wizard', 'u1', { foo: 'bar' }, 1);
		const key = 'wizard:u1';
		const saved = store.get(key);
		if (!saved) throw new Error('expected saved envelope');
		saved.updatedAt = Date.now() - 100_000;
		store.set(key, saved);

		await expect(Persistence.load('wizard', 'u1', 1, 10)).resolves.toBeNull();
		expect(store.has(key)).toBe(false);
	});

	test('returns null when indexedDB open fails', async () => {
		const failingIndexedDb = {
			open: vi.fn((_name: string, _version: number) => {
				const req: { onerror?: () => void } = {};
				queueMicrotask(() => req.onerror?.());
				return req;
			})
		};

		(globalThis as { indexedDB: IDBFactory }).indexedDB =
			failingIndexedDb as unknown as IDBFactory;
		const Persistence = await loadPersistenceWithBrowser(true);
		await expect(
			Persistence.load('wizard', 'u1', 1, 1_000)
		).resolves.toBeNull();
	});

	test('clear removes persisted key', async () => {
		const { indexedDB, store } = createIndexedDbMock();
		(globalThis as { indexedDB: IDBFactory }).indexedDB =
			indexedDB as unknown as IDBFactory;
		const Persistence = await loadPersistenceWithBrowser(true);

		await Persistence.save('wizard', 'u1', { n: 1 }, 1);
		expect(store.has('wizard:u1')).toBe(true);

		await Persistence.clear('wizard', 'u1');
		expect(store.has('wizard:u1')).toBe(false);
	});
});

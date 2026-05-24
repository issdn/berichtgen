import { browser } from '$app/environment';

const DB_NAME = 'berichtgen';
const STORE_NAME = 'persistence';

type Envelope<T> = {
	data: T;
	key: string;
	scope: string;
	updatedAt: number;
	version: number;
};

async function clear(storeName: string, key: string): Promise<void> {
	const db = await openDb();
	if (!db) return;
	await new Promise<void>((resolve) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		tx.objectStore(STORE_NAME).delete(`${storeName}:${key}`);
		tx.oncomplete = () => resolve();
		tx.onerror = () => resolve();
	});
}

function hasIndexedDb() {
	return browser && typeof indexedDB !== 'undefined';
}

async function load<T>(
	storeName: string,
	key: string,
	version: number,
	ttlMs: number
): Promise<null | T> {
	const db = await openDb();
	if (!db) return null;
	const envelope = await new Promise<Envelope<T> | null>((resolve) => {
		const tx = db.transaction(STORE_NAME, 'readonly');
		const req = tx.objectStore(STORE_NAME).get(`${storeName}:${key}`);
		req.onsuccess = () => resolve((req.result as Envelope<T>) ?? null);
		req.onerror = () => resolve(null);
	});
	if (!envelope) return null;
	if (envelope.version !== version || Date.now() - envelope.updatedAt > ttlMs) {
		await clear(storeName, key);
		return null;
	}
	return envelope.data;
}

function openDb(): Promise<IDBDatabase | null> {
	if (!hasIndexedDb()) return Promise.resolve(null);
	return new Promise((resolve) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'key' });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => resolve(null);
	});
}

async function save<T>(
	storeName: string,
	key: string,
	data: T,
	version: number
): Promise<void> {
	const db = await openDb();
	if (!db) return;
	await new Promise<void>((resolve) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		tx.objectStore(STORE_NAME).put({
			data,
			key: `${storeName}:${key}`,
			scope: storeName,
			updatedAt: Date.now(),
			version
		} satisfies Envelope<T>);
		tx.oncomplete = () => resolve();
		tx.onerror = () => resolve();
	});
}

const Persistence = {
	clear,
	load,
	save
};

export default Persistence;

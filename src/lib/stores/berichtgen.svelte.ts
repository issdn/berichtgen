import { browser, dev } from '$app/environment';
import { SvelteMap } from 'svelte/reactivity';

const DEFAULT_SETTINGS: App.***REMOVED***Settings = {
	processPhotos: false,
	rewordJSON: false,
	constantHours: false,
	useDevEndpoint: false,
	preferredTemplatePath: null,
	tempEmailContainer: null
};

const settings = new SvelteMap<
	keyof App.***REMOVED***Settings,
	App.***REMOVED***Settings[keyof App.***REMOVED***Settings]
>(Object.entries(DEFAULT_SETTINGS) as [keyof App.***REMOVED***Settings, App.***REMOVED***Settings[keyof App.***REMOVED***Settings]][]);

let hydrated = false;

function parseStoredSetting<K extends keyof App.***REMOVED***Settings>(
	key: K
): App.***REMOVED***Settings[K] | null {
	if (!browser) return null;
	const raw = localStorage.getItem(key);
	if (raw === null) return null;
	try {
		return JSON.parse(raw) as App.***REMOVED***Settings[K];
	} catch {
		return null;
	}
}

function shouldPersistKey(key: keyof App.***REMOVED***Settings): boolean {
	if (key !== 'useDevEndpoint') return true;
	return dev;
}

function ensureHydrated() {
	if (!browser || hydrated) return;
	(
		Object.keys(DEFAULT_SETTINGS) as Array<keyof App.***REMOVED***Settings>
	).forEach((key) => {
		const parsed = parseStoredSetting(key);
		if (parsed !== null) {
			settings.set(key, parsed);
		}
	});
	hydrated = true;
}

function get<K extends keyof App.***REMOVED***Settings>(
	key: K
): App.***REMOVED***Settings[K] {
	ensureHydrated();
	return settings.get(key)! as App.***REMOVED***Settings[K];
}

function set<K extends keyof App.***REMOVED***Settings>(
	key: K,
	value: App.***REMOVED***Settings[K]
) {
	ensureHydrated();
	settings.set(key, value);
	if (browser && shouldPersistKey(key)) {
		localStorage.setItem(key, JSON.stringify(value));
	}
}

const berichtgenStore = {
	get,
	set
};

export default berichtgenStore;

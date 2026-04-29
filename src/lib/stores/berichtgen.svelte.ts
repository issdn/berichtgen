import { browser, dev } from '$app/environment';
import { SvelteMap } from 'svelte/reactivity';

const DEFAULT_SETTINGS: App.BerichtgenSettings = {
	processPhotos: false,
	rewordJSON: false,
	constantHours: false,
	useDevEndpoint: false,
	preferredTemplatePath: null,
	tempEmailContainer: null
};

const settings = new SvelteMap<
	keyof App.BerichtgenSettings,
	App.BerichtgenSettings[keyof App.BerichtgenSettings]
>(Object.entries(DEFAULT_SETTINGS) as [keyof App.BerichtgenSettings, App.BerichtgenSettings[keyof App.BerichtgenSettings]][]);

let hydrated = false;

function parseStoredSetting<K extends keyof App.BerichtgenSettings>(
	key: K
): App.BerichtgenSettings[K] | null {
	if (!browser) return null;
	const raw = localStorage.getItem(key);
	if (raw === null) return null;
	try {
		return JSON.parse(raw) as App.BerichtgenSettings[K];
	} catch {
		return null;
	}
}

function shouldPersistKey(key: keyof App.BerichtgenSettings): boolean {
	if (key !== 'useDevEndpoint') return true;
	return dev;
}

function ensureHydrated() {
	if (!browser || hydrated) return;
	(
		Object.keys(DEFAULT_SETTINGS) as Array<keyof App.BerichtgenSettings>
	).forEach((key) => {
		const parsed = parseStoredSetting(key);
		if (parsed !== null) {
			settings.set(key, parsed);
		}
	});
	hydrated = true;
}

function get<K extends keyof App.BerichtgenSettings>(
	key: K
): App.BerichtgenSettings[K] {
	ensureHydrated();
	return settings.get(key)! as App.BerichtgenSettings[K];
}

function set<K extends keyof App.BerichtgenSettings>(
	key: K,
	value: App.BerichtgenSettings[K]
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

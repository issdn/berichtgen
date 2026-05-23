import { browser } from '$app/environment';
import { BerichtgenError, ECommonServerError } from '$lib/errors';
import { tryResult } from '$lib/result';
import { SvelteMap } from 'svelte/reactivity';

const DEFAULT_SETTINGS: App.BerichtgenSettings = {
	rewordJSON: false,
	constantHours: false,
	preferredTemplatePath: null,
	tempEmailContainer: null
};

const settings = new SvelteMap<
	keyof App.BerichtgenSettings,
	App.BerichtgenSettings[keyof App.BerichtgenSettings]
>(
	Object.entries(DEFAULT_SETTINGS) as [
		keyof App.BerichtgenSettings,
		App.BerichtgenSettings[keyof App.BerichtgenSettings]
	][]
);

let hydrated = false;

function parseStoredSetting<K extends keyof App.BerichtgenSettings>(
	key: K
): App.BerichtgenSettings[K] | null {
	if (!browser) return null;
	const raw = localStorage.getItem(key);
	if (raw === null) return null;
	const parsed = tryResult(
		() => JSON.parse(raw) as App.BerichtgenSettings[K],
		BerichtgenError,
		ECommonServerError.INTERNAL_ERROR
	);
	return parsed.ok ? parsed.data : null;
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
	if (browser) {
		localStorage.setItem(key, JSON.stringify(value));
	}
}

const berichtgenStore = {
	get,
	set
};

export default berichtgenStore;

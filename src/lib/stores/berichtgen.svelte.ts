import type { ProviderSchemaType } from '$src/lib/schemas';

class ***REMOVED***Store {
	_providers: ProviderSchemaType[] | null = $state(null);

	_currentProvider: ProviderSchemaType | null = $state(null);

	get providers() {
		return this._providers!;
	}

	set providers(value) {
		this._providers = value;
	}

	get currentProvider() {
		return this._currentProvider!;
	}

	set currentProvider(value) {
		localStorage.setItem('provider', value.id);
		this._currentProvider = value;
	}

	processPhotos = $state(false);

	rewordJSON = $state(false);

	tempEmailContainer: null | string = $state(null);

	userTokens: number | null = $state(null);
}

export const berichtgenStore = new ***REMOVED***Store();

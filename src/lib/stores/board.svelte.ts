import type { ProviderSchemaType } from '$routes/board/settings/schema';

class IncuriaStore {
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

export const incuriaStore = new IncuriaStore();

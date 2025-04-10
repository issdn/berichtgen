import type { ProviderSchemaType } from '../../routes/board/settings/schema';

class IncuriaStore {
	_providers: ProviderSchemaType[] | null = $state(null);

	_currentProvider: string | null = $state(null);

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
		localStorage.setItem('provider', value);
		this._currentProvider = value;
	}
}

export const incuriaStore = new IncuriaStore();

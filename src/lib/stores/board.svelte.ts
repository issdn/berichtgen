import type { ProviderSchemaType } from '../../routes/board/settings/schema';

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
		this._currentProvider = value;
	}
}

export const incuriaStore = new IncuriaStore();

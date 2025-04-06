import type { ProviderSchemaType } from '../../routes/board/settings/schema';

class IncuriaStore {
	_providers: ProviderSchemaType[] | null = $state(null);

	get providers() {
		return this._providers!;
	}

	set providers(value) {
		this._providers = value;
	}
}

export const incuriaStore = new IncuriaStore();

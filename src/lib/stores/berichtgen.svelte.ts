import type { ProviderSchemaType } from '$src/lib/schemas';

class ***REMOVED***Store {
	_currentProvider: ProviderSchemaType | null = $state(null);

	_processPhotos = $state(false);

	_rewordJSON = $state(false);

	_contantHours = $state(false);

	_preferedTemplatePath = $state<string | null>(null);

	get currentProvider() {
		return this._currentProvider!;
	}

	set currentProvider(value) {
		localStorage.setItem('provider', value.id);
		this._currentProvider = value;
	}

	get processPhotos() {
		return this._processPhotos;
	}

	set processPhotos(value: boolean) {
		localStorage.setItem('processPhotos', JSON.stringify(value));
		this._processPhotos = value;
	}

	get rewordJSON() {
		return this._rewordJSON;
	}

	set rewordJSON(value: boolean) {
		localStorage.setItem('rewordJSON', JSON.stringify(value));
		this._rewordJSON = value;
	}

	get contantHours() {
		return this._contantHours;
	}

	set contantHours(value: boolean) {
		localStorage.setItem('contantHours', JSON.stringify(value));
		this._contantHours = value;
	}

	get preferedTemplatePath() {
		return this._preferedTemplatePath;
	}

	set preferedTemplatePath(value: string | null) {
		localStorage.setItem('preferedTemplatePath', JSON.stringify(value));
		this._preferedTemplatePath = value;
	}

	tempEmailContainer: null | string = $state(null);
}

export const berichtgenStore = new ***REMOVED***Store();

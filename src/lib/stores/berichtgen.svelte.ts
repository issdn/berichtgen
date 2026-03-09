class ***REMOVED***Store {
	_processPhotos = $state(false);

	_rewordJSON = $state(false);

	_contantHours = $state(false);

	_preferedTemplatePath = $state<string | null>(null);

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

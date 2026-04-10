class ***REMOVED***Store {
	_processPhotos = $state(false);

	_rewordJSON = $state(false);

	_constantHours = $state(false);

	_useDevEndpoint = $state(false);

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

	get constantHours() {
		return this._constantHours;
	}

	set constantHours(value: boolean) {
		localStorage.setItem('constantHours', JSON.stringify(value));
		this._constantHours = value;
	}

	get useDevEndpoint() {
		return this._useDevEndpoint;
	}

	set useDevEndpoint(value: boolean) {
		this._useDevEndpoint = value;
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

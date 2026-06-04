import type { DateRangeSchema } from '$wizard/schemas';

import { FileTypes } from '$wizard/enums';

/** Wizard-specific file wrapper that can carry config and synthetic URL inputs. */
export class WizardFile extends File {
	config?: DateRangeSchema;

	/** Returns whether this wizard file represents a URL input. */
	get isUrl(): boolean {
		return this.type === FileTypes.URI_LIST;
	}

	/** Returns the URL for synthetic URL files, otherwise null. */
	get url(): null | string {
		return this.isUrl ? this.name : null;
	}

	/** Creates a wizard file from a regular file and optionally attaches config. */
	static fromFile({
		config,
		file
	}: {
		config?: DateRangeSchema;
		file: File;
	}): WizardFile {
		if (file instanceof WizardFile) {
			if (config !== undefined) file.config = config;
			return file;
		}

		const wizardFile = new WizardFile([file], file.name, {
			lastModified: file.lastModified,
			type: file.type
		});
		if (config !== undefined) wizardFile.config = config;
		return wizardFile;
	}

	/** Creates a synthetic wizard file that represents a URL input. */
	static fromUrl({
		config,
		url
	}: {
		config?: DateRangeSchema;
		url: string;
	}): WizardFile {
		const wizardFile = new WizardFile([url], url, {
			type: FileTypes.URI_LIST
		});
		if (config !== undefined) wizardFile.config = config;
		return wizardFile;
	}
}

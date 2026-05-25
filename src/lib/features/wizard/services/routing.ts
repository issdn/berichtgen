import type { Ort } from '$wizard/enums';
import type { BatchCompletionItem } from '$wizard/schemas';

import { EWizardError, WizardError } from '$wizard/errors';
import { batchCompletionItemSchema } from '$wizard/schemas';

export interface FileRouting {
	getSize(): number;
	toBatchCompletionItem({ ort }: { ort: Ort }): BatchCompletionItem;
	type: 'gcs' | 'inline' | 'url';
}

/** The file was uploaded directly to Google Cloud Storage. null means file already exists in the storage. */
export class GcsRouting implements FileRouting {
	static readonly type = 'gcs' as const;

	fileUri: string;
	mimeType: string;
	signedUrl: null | string;
	readonly type = GcsRouting.type;

	constructor({
		fileUri,
		mimeType,
		signedUrl = null
	}: {
		fileUri: string;
		mimeType: string;
		signedUrl?: null | string;
	}) {
		this.fileUri = fileUri;
		this.mimeType = mimeType;
		this.signedUrl = signedUrl;
	}

	static restore({
		value
	}: {
		value: Extract<BatchCompletionItem, { type: 'gcs' }>;
	}): FileRouting {
		return new GcsRouting({
			fileUri: value.fileUri,
			mimeType: value.mimeType,
			signedUrl: null
		});
	}

	getSize(): number {
		return getByteSize(this.fileUri);
	}

	toBatchCompletionItem({ ort }: { ort: Ort }): BatchCompletionItem {
		return {
			fileUri: this.fileUri,
			mimeType: this.mimeType,
			ort,
			type: this.type
		};
	}
}

/** The file is small enough (= 1 MB) to be sent inline as text payload. */
export class InlineRouting implements FileRouting {
	static readonly type = 'inline' as const;

	data: string;
	mimeType: string;
	readonly type = InlineRouting.type;

	constructor({ data, mimeType }: { data: string; mimeType: string }) {
		this.data = data;
		this.mimeType = mimeType;
	}

	static restore({
		value
	}: {
		value: Extract<BatchCompletionItem, { type: 'inline' }>;
	}): FileRouting {
		return new InlineRouting({
			data: value.data,
			mimeType: value.mimeType
		});
	}

	getSize(): number {
		return getByteSize(this.data);
	}

	toBatchCompletionItem({ ort }: { ort: Ort }): BatchCompletionItem {
		return {
			data: this.data,
			mimeType: this.mimeType,
			ort,
			type: this.type
		};
	}
}

/** A web URL pasted by the user or specified in the config file. */
export class UrlRouting implements FileRouting {
	static readonly type = 'url' as const;

	readonly type = UrlRouting.type;
	url: string;

	constructor({ url }: { url: string }) {
		this.url = url;
	}

	static restore({
		value
	}: {
		value: Extract<BatchCompletionItem, { type: 'url' }>;
	}): FileRouting {
		return new UrlRouting({ url: value.url });
	}

	getSize(): number {
		return getByteSize(this.url);
	}

	toBatchCompletionItem({ ort }: { ort: Ort }): BatchCompletionItem {
		return {
			ort,
			type: this.type,
			url: this.url
		};
	}
}

export function restoreFileRouting({ value }: { value: unknown }): FileRouting {
	const decoded = batchCompletionItemSchema.safeParse(value);
	if (!decoded.success) {
		throw new WizardError({
			...EWizardError.REHYDRATION_FAILED,
			cause: decoded.error.message
		});
	}

	if (decoded.data.type === UrlRouting.type) {
		return UrlRouting.restore({ value: decoded.data });
	}
	if (decoded.data.type === InlineRouting.type) {
		return InlineRouting.restore({ value: decoded.data });
	}
	return GcsRouting.restore({ value: decoded.data });
}

function getByteSize(value: string): number {
	return new TextEncoder().encode(value).byteLength;
}

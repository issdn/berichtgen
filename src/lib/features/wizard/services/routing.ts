import type { Ort } from '$wizard/enums';
import type { BatchCompletionItem } from '$wizard/schemas';

import { BerichtgenError } from '$lib/errors';
import { EWizardError } from '$wizard/errors';
import {
	fileApiItemSchema,
	inlineItemSchema,
	urlItemSchema
} from '$wizard/schemas';

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

	static restore({ value }: { value: unknown }): FileRouting {
		const decoded = fileApiItemSchema.safeParse(value);
		if (!decoded.success) {
			throw new BerichtgenError({
				...EWizardError.REHYDRATION_FAILED,
				cause: 'Ungültige GCS-Routing-Daten.'
			});
		}

		return new GcsRouting({
			fileUri: decoded.data.fileUri,
			mimeType: decoded.data.mimeType,
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

	static restore({ value }: { value: unknown }): FileRouting {
		const decoded = inlineItemSchema.safeParse(value);
		if (!decoded.success) {
			throw new BerichtgenError({
				...EWizardError.REHYDRATION_FAILED,
				cause: 'Ungültige Inline-Routing-Daten.'
			});
		}

		return new InlineRouting({
			data: decoded.data.data,
			mimeType: decoded.data.mimeType
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

	static restore({ value }: { value: unknown }): FileRouting {
		const decoded = urlItemSchema.safeParse(value);
		if (!decoded.success) {
			throw new BerichtgenError({
				...EWizardError.REHYDRATION_FAILED,
				cause: 'Ungültige URL-Routing-Daten.'
			});
		}

		return new UrlRouting({ url: decoded.data.url });
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
	if (value === null || typeof value !== 'object') {
		throw new BerichtgenError({
			...EWizardError.REHYDRATION_FAILED,
			cause: 'Der Routing-Snapshot muss ein Objekt sein.'
		});
	}
	const type = (value as { type?: unknown }).type;

	if (type === UrlRouting.type) {
		return UrlRouting.restore({ value });
	}
	if (type === InlineRouting.type) {
		return InlineRouting.restore({ value });
	}
	if (type === GcsRouting.type) {
		return GcsRouting.restore({ value });
	}

	throw new BerichtgenError({
		...EWizardError.REHYDRATION_FAILED,
		cause: `Nicht unterstützter Routing-Typ: ${String(type)}`
	});
}

function getByteSize(value: string): number {
	return new TextEncoder().encode(value).byteLength;
}

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import type { ImageLike, Scheduler } from 'tesseract.js';
import { IncuriaError, IncuriaErrorType } from '$lib/types';
import type { WizardFileContext } from '$lib/wizard_scheduler.svelte';
import { Parser } from './parser';

export type DOCXFileData = {
	images: Map<string, Uint8Array<ArrayBufferLike>>;
	imgRels: Map<string, string>;
	textsOrRelIds: (string | [string])[];
};

export class DOCXParser extends Parser {
	data: DOCXFileData | null = null;

	constructor(context: WizardFileContext, scheduler: Scheduler | null) {
		super(context, scheduler);
	}

	async init(data: Uint8Array) {
		const zip = new JSZip();
		const docx = await zip.loadAsync(data);
		const parser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: '@_'
		});

		const textsOrRelIds: (string | [string])[] = [];
		this.withImages = this.scheduler !== null;

		const fileData = await docx.files['word/document.xml'].async('string');
		const xml = parser.parse(fileData);
		this.findAllWT(xml, textsOrRelIds, this.withImages);

		const imagesAndRels = this.withImages
			? await this.mapImagesToRels(docx, parser)
			: {
					images: new Map<string, Uint8Array>(),
					imgRels: new Map<string, string>()
				};

		this.withImages = this.withImages && imagesAndRels.images.size != 0;

		this.data = {
			...imagesAndRels,
			textsOrRelIds
		};

		this.context.max = this.data.textsOrRelIds.length;
		await this.createWorkerPool(this.data!.images.size);
	}

	async parse() {
		if (this.data === null)
			throw new IncuriaError(
				IncuriaErrorType.DEVELOPERS_FAULT,
				'FileWizard wurde nicht initialisiert.'
			);
		const result = [];
		for (let i = 0; i < this.data.textsOrRelIds.length; i += this.batchSize) {
			if (this.context.cancelled) break;
			result.push(
				...(await Promise.all(
					this.data.textsOrRelIds
						.slice(i, i + this.batchSize)
						.map(async (textOrId) => this.parseChunk(textOrId)) as Promise<string>[]
				))
			);
		}
		this.freeWorkers();
		return result;
	}

	private async parseChunk(textOrId: string | [string]) {
		if (Array.isArray(textOrId)) {
			const rel = this.data!.imgRels.get(textOrId[0]);
			if (rel === undefined) {
				throw new IncuriaError(
					IncuriaErrorType.DOCX_FAULTY,
					'DOCX Foto könnte nicht gefunden werden.'
				);
			}
			const fileData = this.data!.images.get(rel);
			if (fileData === undefined) {
				throw new IncuriaError(
					IncuriaErrorType.DOCX_FAULTY,
					'DOCX Foto könnte nicht gefunden werden.'
				);
			}
			if (this.withImages) {
				const result = await this.scheduler!.addJob('recognize', fileData as ImageLike);
				this.context.onProgress();
				return result.data.text;
			}
		} else {
			this.context.onProgress();
			return textOrId;
		}
	}

	private async findAllWT(
		obj: Record<string, unknown>,
		results: (string | [string])[] = [],
		withImages: boolean
	) {
		if (typeof obj === 'object') {
			for (const key in obj) {
				if (key === 'w:t') {
					const text = obj[key] as string;
					if (text.length > 3) results.push(text);
				} else if (key === 'a:blip' && withImages) {
					results.push([(obj[key] as Record<string, string>)['@_r:embed']]);
				} else {
					this.findAllWT(obj[key] as Record<string, unknown>, results, withImages);
				}
			}
		}
		return results;
	}

	private async mapImagesToRels(docx: JSZip, parser: XMLParser) {
		const images: Map<string, Uint8Array> = new Map();
		const imgRels: Map<string, string> = new Map();

		const mediaFiles = Object.keys(docx.files).filter((fileName) =>
			fileName.startsWith('word/media/')
		);

		const relsFiles = Object.keys(docx.files).filter((fileName) =>
			fileName.startsWith('word/_rels/document.xml.rels')
		);

		await Promise.all(
			mediaFiles.map(async (fileName) => {
				const fileData = await docx.files[fileName].async('uint8array');
				images.set(fileName.replace('word/', ''), fileData);
			})
		);

		await Promise.all(
			relsFiles.map(async (fileName) => {
				const fileData = await docx.files[fileName].async('string');
				const xml = parser.parse(fileData);

				for (const rel of xml.Relationships.Relationship) {
					if (rel['@_Target'].startsWith('media/image')) {
						imgRels.set(rel['@_Id'], rel['@_Target']);
					}
				}
			})
		);

		return { images, imgRels };
	}
}

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import type { ImageLike, Scheduler } from 'tesseract.js';
import { IncuriaError, IncuriaErrorType } from '$lib/types';

export async function parseDOCXData(data: Uint8Array, scheduler: Scheduler | null = null) {
	const zip = new JSZip();
	const docx = await zip.loadAsync(data);
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '@_'
	});

	const textsOrRelIds: (string | [string])[] = [];
	const withImages = scheduler !== null;

	const fileData = await docx.files['word/document.xml'].async('string');
	const xml = parser.parse(fileData);
	findAllWT(xml, textsOrRelIds, withImages);

	const imagesAndRels = withImages
		? await mapImagesToRels(docx, parser)
		: {
				images: new Map<string, Uint8Array>(),
				imgRels: new Map<string, string>()
			};

	return { ...imagesAndRels, withImages, textsOrRelIds };
}

export async function parseDOCX(
	{ images, imgRels, withImages, textsOrRelIds }: Awaited<ReturnType<typeof parseDOCXData>>,
	scheduler: Scheduler | null = null,
	onChunkFinished: ((chunk: string) => void) | null = null
) {
	return Promise.all(
		textsOrRelIds.map(async (textOrId) => {
			if (Array.isArray(textOrId)) {
				const rel = imgRels.get(textOrId[0]);
				if (rel === undefined) {
					throw new IncuriaError(
						IncuriaErrorType.DOCX_FAULTY,
						'DOCX Foto könnte nicht gefunden werden.'
					);
				}
				const fileData = images.get(rel);
				if (fileData === undefined) {
					throw new IncuriaError(
						IncuriaErrorType.DOCX_FAULTY,
						'DOCX Foto könnte nicht gefunden werden.'
					);
				}
				if (withImages) {
					const result = await scheduler!.addJob('recognize', fileData as ImageLike);
					onChunkFinished?.(result.data.text);
					return result.data.text;
				}
			} else {
				onChunkFinished?.(textOrId);
				return textOrId;
			}
		}) as Promise<string>[]
	);
}

function findAllWT(
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
				findAllWT(obj[key] as Record<string, unknown>, results, withImages);
			}
		}
	}
	return results;
}

async function mapImagesToRels(docx: JSZip, parser: XMLParser) {
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

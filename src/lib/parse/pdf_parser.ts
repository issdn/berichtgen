import { IncuriaError, IncuriaErrorType } from '$lib/types';
import * as pdf from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api.js';
import type { Scheduler } from 'tesseract.js';

import pdfWorkerURL from 'pdfjs-dist/build/pdf.worker.min?url';
pdf.GlobalWorkerOptions.workerSrc = new URL(pdfWorkerURL, import.meta.url).toString();

type ImageExtractProp = {
	scheduler: Scheduler | null;
	getNewCanvas:
		| ((
				width: number,
				height: number
		  ) => { canvas: OffscreenCanvas; context: OffscreenCanvasRenderingContext2D })
		| null;
};

// Basically parsing goes like this -> get fundamental Data about the file so that some progress could be shown to the user.
// Here it's number of texts and images. Then pass it to the real, heavy parse function so that it parses the text.
export async function parsePDF(
	blobsOrNullsAndPages: Awaited<ReturnType<typeof parsePDFData>>['blobsOrNullsAndPages'],
	{ scheduler = null }: ImageExtractProp,
	onPageFinished?: ((chunk: string) => void) | null
) {
	return await Promise.all(
		blobsOrNullsAndPages.map(async ({ blobOrNull, page }) => {
			let text: string;
			if (blobOrNull === null) {
				text = (await page.getTextContent()).items.map((c) => (c as TextItem).str).join('/n');
			} else {
				text = (await scheduler!.addJob('recognize', blobOrNull)).data.text;
			}
			onPageFinished?.(text);
			return text;
		})
	);
}

export async function parsePDFData(
	data: Uint8Array,
	imageExtractProp: ImageExtractProp = {
		scheduler: null,
		getNewCanvas: null
	}
) {
	const document = await pdf.getDocument(data).promise;
	let nrImages = 0;
	const blobsOrNullsAndPages = await Promise.all(
		Array.from({ length: document.numPages }, (_, i) =>
			(async () => {
				const page = await document.getPage(i + 1);
				const blobOrNull = await getBlobs(page, imageExtractProp);
				if (blobOrNull !== null) nrImages += 1;
				return { blobOrNull, page };
			})()
		)
	);
	return { nrImages, blobsOrNullsAndPages };
}

async function getBlobs(
	page: pdf.PDFPageProxy,
	{ scheduler, getNewCanvas }: ImageExtractProp = {
		scheduler: null,
		getNewCanvas: null
	}
) {
	const ops = (await page.getOperatorList()).fnArray;
	const viewport = page.getViewport({ scale: 1 });

	const imageXObjects = ops.filter((op) => op === pdf.OPS.paintImageXObject);

	if (imageXObjects.length === 0 || scheduler === null) {
		return null;
	}

	if (getNewCanvas === null) {
		throw new IncuriaError(
			IncuriaErrorType.DEVELOPERS_FAULT,
			'To use text from image extraction you have to pass getNewCanvas.'
		);
	}

	const { canvas, context } = getNewCanvas(viewport.width, viewport.height);

	await page.render({
		canvasContext: context as unknown as CanvasRenderingContext2D,
		viewport: viewport
	}).promise;

	return await canvas.convertToBlob();
}

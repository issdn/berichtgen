import { IncuriaError, IncuriaErrorType } from '$lib/types';
import * as pdf from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api.js';
import type { Worker } from 'tesseract.js';
type ImageExtractProp = {
	worker: Worker | null;
	getNewCanvas:
		| ((
				width: number,
				height: number
		  ) => { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D })
		| null;
};

export async function parsePDFData(data: Uint8Array) {
	return await pdf.getDocument(data).promise;
}

async function extractFromPage(
	page: pdf.PDFPageProxy,
	{ worker, getNewCanvas }: ImageExtractProp = {
		worker: null,
		getNewCanvas: null
	}
) {
	const ops = (await page.getOperatorList()).fnArray;
	const viewport = page.getViewport({ scale: 1 });

	const imageXObjects = ops.filter((op) => op === pdf.OPS.paintImageXObject);

	if (imageXObjects.length === 0 || worker === null) {
		return (await page.getTextContent()).items.map((c) => (c as TextItem).str).join('/n');
	}

	if (getNewCanvas === null) {
		throw new IncuriaError(
			IncuriaErrorType.DEVELOPERS_FAULT,
			'To use text from image extraction you have to pass getNewCanvas.'
		);
	}

	const { canvas, context } = getNewCanvas(viewport.width, viewport.height);

	await page.render({ canvasContext: context, viewport: viewport }).promise;

	const blob = await new Promise<Blob>((resolve, reject) =>
		canvas.toBlob((blob) => (blob === null ? reject() : resolve(blob)))
	);

	const text = (await worker.recognize(blob)).data.text;
	return text;
}

export async function* parsePDF(
	data: Awaited<ReturnType<typeof parsePDFData>>,
	imageExtractProp: ImageExtractProp = {
		worker: null,
		getNewCanvas: null
	}
) {
	for (let i = 1; i <= data.numPages; i++) {
		const page = await data.getPage(i);
		yield extractFromPage(page, imageExtractProp);
	}
}

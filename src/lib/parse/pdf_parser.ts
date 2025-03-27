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

export async function parsePDFData(data: Uint8Array) {
	return await pdf.getDocument(data).promise;
}

async function extractFromPage(
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
		return (await page.getTextContent()).items.map((c) => (c as TextItem).str).join('/n');
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

	const blob = await canvas.convertToBlob();

	const text = (await scheduler.addJob('recognize', blob)).data.text;
	return text;
}

export async function parsePDF(
	data: Awaited<ReturnType<typeof parsePDFData>>,
	imageExtractProp: ImageExtractProp = {
		scheduler: null,
		getNewCanvas: null
	},
	onPageFinished?: ((chunk: string) => void) | null
) {
	return await Promise.all(
		Array.from({ length: data.numPages }, (_, i) =>
			(async () => {
				const page = await data.getPage(i + 1);
				const pageText = await extractFromPage(page, imageExtractProp);
				onPageFinished?.(pageText);
				return pageText;
			})()
		)
	);
}

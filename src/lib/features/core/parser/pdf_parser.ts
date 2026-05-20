import { Parser } from '$core/parser/parser';
import { ParserError, EParserError } from '$core/parser/errors';
import type { WizardFileContext } from '$wizard/services/wizard_file_context';
import * as pdf from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { Scheduler } from 'tesseract.js';

export type PDFFileData = {
	blobOrNull: Blob | null;
	page: pdf.PDFPageProxy;
}[];

type GetCanvasFunction = (
	width: number,
	height: number
) => { canvas: OffscreenCanvas; context: OffscreenCanvasRenderingContext2D };

// Basically parsing goes like this -> get fundamental Data about the file so that some context could be shown to the user.
// Here it's number of texts and images. Then pass it to the real, heavy parse function so that it parses the text.
export class PDFParser extends Parser {
	data: PDFFileData | null = null;

	getNewCanvas: GetCanvasFunction | null;

	constructor(
		context: WizardFileContext,
		scheduler: Scheduler,
		getNewCanvas: GetCanvasFunction,
		withImages: boolean = false
	) {
		if (context == null || getNewCanvas == null) {
			throw new ParserError(EParserError.DEVELOPERS_FAULT);
		}
		super(context, scheduler, withImages);
		this.getNewCanvas = getNewCanvas;
	}

	async init(data: Uint8Array) {
		const document = await pdf.getDocument(data).promise;
		let nrImages = 0;
		const blobsOrNullsAndPages = await Promise.all(
			Array.from({ length: document.numPages }, (_, i) =>
				(async () => {
					let blobOrNull = null;
					const page = await document.getPage(i + 1);
					if (this.withImages) {
						blobOrNull = await this.getPageAsImageBlob(page);
						if (blobOrNull !== null) nrImages += 1;
					}
					return { blobOrNull, page };
				})()
			)
		);

		this.data = blobsOrNullsAndPages;
		if (this.withImages) {
			await this.createWorkerPool(nrImages);
		}
	}

	async parse() {
		if (this.data === null)
			throw new ParserError(EParserError.DEVELOPERS_FAULT);
		const result = [];
		for (let i = 0; i < this.data.length; i += this.batchSize) {
			if (this.context.cancelled) break;
			result.push(
				...(await Promise.all(
					this.data!.slice(i, i + this.batchSize).map(
						async ({ blobOrNull, page }) => {
							let text: string;
							if (blobOrNull === null) {
								text = (await page.getTextContent()).items
									.map((c) => (c as TextItem).str)
									.join('/n');
							} else {
								text = (await this.scheduler!.addJob('recognize', blobOrNull))
									.data.text;
							}
							return text;
						}
					)
				))
			);
		}
		this.freeWorkers();
		return result.join('\n');
	}

	private async getPageAsImageBlob(page: pdf.PDFPageProxy) {
		const ops = (await page.getOperatorList()).fnArray;
		const viewport = page.getViewport({ scale: 1 });

		const imageXObjects = ops.filter((op) => op === pdf.OPS.paintImageXObject);

		if (imageXObjects.length === 0 || this.scheduler === null) {
			return null;
		}

		const { canvas, context } = this.getNewCanvas!(
			viewport.width,
			viewport.height
		);

		await page.render({
			canvasContext: context as unknown as CanvasRenderingContext2D,
			viewport: viewport
		}).promise;

		return await canvas.convertToBlob();
	}
}

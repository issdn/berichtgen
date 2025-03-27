import { createWorker, createScheduler } from 'tesseract.js';
import { createCanvas } from 'canvas';
import { parsePDF, parsePDFData } from '$lib/parse/pdf_parser';
import { parseDOCX, parseDOCXData } from '$lib/parse/docx_parser';
import { expect, test } from 'bun:test';

test('Read text from docx kurwa', async () => {
	const scheduler = await createScheduler();
	scheduler.addWorker(await createWorker('eng'));
	const file = await Bun.file('./src/test/text_img.docx').bytes();
	const docxData = await parseDOCXData(file, scheduler);
	const response = await parseDOCX(docxData, scheduler);

	await scheduler.terminate();
	expect(response.join('\n')).toBe(['NORMAL TEXT', 'IMAGE TEXT\n'].join('\n'));
});

test('Read text from pdf kurwa', async () => {
	const scheduler = await createScheduler();
	scheduler.addWorker(await createWorker('eng'));
	const file = await Bun.file('./src/test/text_img.pdf').bytes();
	const imageExtractProp = {
		scheduler,
		getNewCanvas: (width: number, height: number) => {
			const canvas = createCanvas(width, height) as unknown as OffscreenCanvas;
			canvas.convertToBlob = function () {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				return (canvas as any).toBuffer();
			};
			return { canvas, context: canvas.getContext('2d')! };
		}
	};
	const { blobsOrNullsAndPages, nrImages } = await parsePDFData(
		new Uint8Array(file),
		imageExtractProp
	);
	const result = await parsePDF(blobsOrNullsAndPages, imageExtractProp);

	await scheduler.terminate();
	expect(nrImages).toBe(1);
	expect(result.join('\n')).toBe(['IMAGE TEXT\n'].join('\n'));
});

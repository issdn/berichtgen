import { createWorker } from 'tesseract.js';
import { createCanvas } from 'canvas';
import { parsePDF, parsePDFData } from '$lib/parse/pdf_parser';
import { parseDOCX, parseDOCXData } from '$lib/parse/docx_parser';
import { expect, test } from 'bun:test';

test('Read text from docx kurwa', async () => {
	const worker = await createWorker('eng');
	const file = await Bun.file('./src/test/text_img.docx').bytes();
	const docxData = await parseDOCXData(file, worker);
	const stream = parseDOCX(docxData, worker);
	const response: string[] = [];

	for await (const text of stream) {
		response.push(text);
	}

	await worker.terminate();
	expect(response.join('\n')).toBe(['NORMAL TEXT', 'IMAGE TEXT\n'].join('\n'));
});

test('Read text from pdf kurwa', async () => {
	const worker = await createWorker('eng');
	const file = await Bun.file('./src/test/text_img.pdf').bytes();
	const stream = parsePDF(await parsePDFData(new Uint8Array(file)), {
		worker,
		getNewCanvas: (width, height) => {
			const canvas = createCanvas(width, height) as unknown as HTMLCanvasElement;
			canvas.toBlob = function (callback) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				callback((canvas as any).toBuffer());
			};
			return { canvas, context: canvas.getContext('2d')! };
		}
	});
	const response: string[] = [];

	for await (const text of stream) {
		response.push(text);
	}

	await worker.terminate();
	expect(response.join('\n')).toBe(['IMAGE TEXT\n'].join('\n'));
});

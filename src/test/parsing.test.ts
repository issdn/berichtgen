import { createWorker, createScheduler } from 'tesseract.js';
import { createCanvas } from 'canvas';
import { DOCXParser } from '$lib/parse/docx_parser';
import { PDFParser } from '$lib/parse/pdf_parser';
import { expect, test } from 'vitest';
import * as fs from 'node:fs';
import { WizardFileContext } from '$src/lib/wizard_file_context.svelte';

const hasDocxFixture = fs.existsSync('./src/test/text_img.docx');
const hasPdfFixture = fs.existsSync('./src/test/text_img.pdf');

// Fixture src/test/text_img.docx required — skip if missing
const testDocx = hasDocxFixture ? test : test.skip;
// Fixture src/test/text_img.pdf required — skip if missing
const testPdf = hasPdfFixture ? test : test.skip;

testDocx('reads plain text and OCR image text from a DOCX file', async () => {
	const scheduler = await createScheduler();
	scheduler.addWorker(await createWorker('eng'));
	const file = await fs.readFileSync('./src/test/text_img.docx');
	const docxParser = new DOCXParser(new WizardFileContext(file as unknown as File), scheduler);
	await docxParser.init(new Uint8Array(file.buffer));
	const response = await docxParser.parse();

	await scheduler.terminate();
	expect(response.join('\n')).toBe(['NORMAL TEXT', 'IMAGE TEXT\n'].join('\n'));
});

testPdf('reads OCR image text from a PDF file', async () => {
	const scheduler = await createScheduler();
	scheduler.addWorker(await createWorker('eng'));
	const file = await fs.readFileSync('./src/test/text_img.pdf');
	const pdfParser = new PDFParser(
		new WizardFileContext(file as unknown as File),
		scheduler,
		(width: number, height: number) => {
			const canvas = createCanvas(width, height) as unknown as OffscreenCanvas;
			canvas.convertToBlob = function () {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				return (canvas as any).toBuffer();
			};
			return { canvas, context: canvas.getContext('2d')! };
		}
	);
	await pdfParser.init(new Uint8Array(file.buffer));
	const response = await pdfParser.parse();

	await scheduler.terminate();
	expect(pdfParser.batchSize).toBe(1);
	expect(response.join('\n')).toBe(['IMAGE TEXT\n'].join('\n'));
});

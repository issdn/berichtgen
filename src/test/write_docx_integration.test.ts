/**
 * Integration test for the full generateReportBytes pipeline.
 * Exercises docx-templates + QuickJS without touching the browser download API.
 */

import { describe, test, expect } from 'vitest';
import { getQuickJS } from 'quickjs-emscripten';
import { generateReportBytes } from '$lib/utils/write_docx';
import { Ort } from '$src/lib/enums';
import type { ResultEntry, UserMetadata } from '$src/lib/types';
import * as fs from 'node:fs';
import JSZip from 'jszip';

const TEMPLATE_PATH = './src/test/template.docx';

const entries: ResultEntry[] = [
	{
		qualifikationen: ['Allgemeinbildende Fächer'],
		text: 'Test Eintrag',
		datum: '2025-01-06',
		ort: Ort.SCHULE,
		hours: 40
	}
];

const userMetadata: UserMetadata = {
	fullName: 'Max Mustermann',
	ausbildungsberuf: 'Fachinformatiker',
	abteilung: 'IT'
};

describe('generateReportBytes integration', () => {
	test('returns a non-empty Uint8Array with DOCX magic bytes (PK)', async () => {
		const QuickJS = await getQuickJS();
		const vm = QuickJS.newContext();
		const deadline = Date.now() + 5_000;
		vm.runtime.setInterruptHandler(() => Date.now() > deadline);
		const injected = new Map<string, string>();

		const template = new Uint8Array(fs.readFileSync(TEMPLATE_PATH));

		let result: Uint8Array;
		try {
			result = await generateReportBytes(template, Promise.resolve(entries), userMetadata, injected, vm);
		} finally {
			vm.dispose();
		}

		expect(result.length).toBeGreaterThan(0);
		// DOCX files are ZIP archives — magic bytes are PK (0x50 0x4B)
		expect(result[0]).toBe(0x50);
		expect(result[1]).toBe(0x4b);
	});

	test('output is a valid ZIP containing word/document.xml', async () => {
		const QuickJS = await getQuickJS();
		const vm = QuickJS.newContext();
		const deadline = Date.now() + 5_000;
		vm.runtime.setInterruptHandler(() => Date.now() > deadline);
		const injected = new Map<string, string>();

		const template = new Uint8Array(fs.readFileSync(TEMPLATE_PATH));

		let result: Uint8Array;
		try {
			result = await generateReportBytes(template, Promise.resolve(entries), userMetadata, injected, vm);
		} finally {
			vm.dispose();
		}

		const zip = await JSZip.loadAsync(result);
		expect(zip.file('word/document.xml')).not.toBeNull();
	});

	test('all template expressions are evaluated (no {{ }} remain in output XML)', async () => {
		const QuickJS = await getQuickJS();
		const vm = QuickJS.newContext();
		const deadline = Date.now() + 5_000;
		vm.runtime.setInterruptHandler(() => Date.now() > deadline);
		const injected = new Map<string, string>();

		const template = new Uint8Array(fs.readFileSync(TEMPLATE_PATH));

		let result: Uint8Array;
		try {
			result = await generateReportBytes(template, Promise.resolve(entries), userMetadata, injected, vm);
		} finally {
			vm.dispose();
		}

		const zip = await JSZip.loadAsync(result);
		const xml = await zip.file('word/document.xml')!.async('string');
		// All {{ }} expressions should have been processed — none should remain
		expect(xml).not.toContain('{{');
		expect(xml.length).toBeGreaterThan(100);
	});
});

/**
 * Standalone bun script: renders template.docx from this directory and writes
 * the output to out.docx next to it.
 *
 * Usage: bun src/test/render-template.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createReport } from 'docx-templates';
import { Ort } from '$wizard/enums';

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const berichte = [
	{
		qualifikationen: ['Allgemeinbildende Fächer'],
		text: 'Im Fach C# Programmierung habe ich gelernt, wie man mit if-Bedingungen einfache Entscheidungsstrukturen programmiert.',
		datum: '2025-01-06',
		bisDatum: '2025-01-10',
		ort: Ort.SCHULE,
		stunden: 40,
		ausbildungsjahr: '2025'
	}
];

const userMetadata = {
	fullName: 'Max Mustermann',
	ausbildungsberuf: 'Fachinformatiker für Anwendungsentwicklung',
	abteilung: 'Softwareentwicklung'
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const templatePath = join(import.meta.dir, 'template.docx');
const outputPath = join(import.meta.dir, 'out.docx');

console.log(`Reading template: ${templatePath}`);
const template = new Uint8Array(readFileSync(templatePath));

const result = await createReport({
	cmdDelimiter: ['{{', '}}'],
	template,
	noSandbox: true,
	data: {
		berichte,
		fullName: userMetadata.fullName,
		ausbildungsberuf: userMetadata.ausbildungsberuf,
		abteilung: userMetadata.abteilung
	}
});

writeFileSync(outputPath, result);
console.log(`Output written: ${outputPath} (${result.length} bytes)`);

/**
 * Standalone bun script: renders fixtures/template.docx and writes
 * fixtures/out.docx.
 *
 * Usage: bun src/test/scripts/render-template.ts
 */

import { Ort } from '$wizard/enums';
import { createReport } from 'docx-templates';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const berichte = [
	{
		ausbildungsjahr: '2025',
		bisDatum: '2025-01-10',
		datum: '2025-01-06',
		ort: Ort.SCHULE,
		qualifikationen: ['Allgemeinbildende Fächer'],
		stunden: 40,
		text: 'Im Fach C# Programmierung habe ich gelernt, wie man mit if-Bedingungen einfache Entscheidungsstrukturen programmiert.'
	}
];

const userMetadata = {
	abteilung: 'Softwareentwicklung',
	ausbildungsberuf: 'Fachinformatiker für Anwendungsentwicklung',
	fullName: 'Max Mustermann'
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const currentDir = dirname(fileURLToPath(import.meta.url));
const templatePath = join(currentDir, '..', 'fixtures', 'template.docx');
const outputPath = join(currentDir, '..', 'fixtures', 'out.docx');

console.log(`Reading template: ${templatePath}`);
const template = new Uint8Array(readFileSync(templatePath));

const result = await createReport({
	cmdDelimiter: ['{{', '}}'],
	data: {
		abteilung: userMetadata.abteilung,
		ausbildungsberuf: userMetadata.ausbildungsberuf,
		berichte,
		fullName: userMetadata.fullName
	},
	noSandbox: true,
	template
});

writeFileSync(outputPath, result);
console.log(`Output written: ${outputPath} (${result.length} bytes)`);

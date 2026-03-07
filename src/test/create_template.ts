import createReport from 'docx-templates';

const template = await Bun.file('src/test/template.docx').bytes();

// Provide test data to the template. Adjust as needed.
const data = {
	berichte: [
		{
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Definitionen zu Leistungen, Kosten, Einzelkosten, Gemeinkosten und fixen Kosten\n\nVerteilung von Gemeinkosten auf verschiedene Kostenstellen',
			datum: '2025-07-07',
			hours: 40,
			ort: 'SCHULE'
		},
		{
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Prüfung der Auswirkungen einer Preissenkung auf den Gewinn unter Beibehaltung der Kostenstruktur\n\nBestimmung der kurzfristigen und langfristigen Preisuntergrenze',
			datum: '2025-06-30',
			hours: 40,
			ort: 'SCHULE'
		},
		    {
        "ort": "SCHULE",
        "text": "Schoener Text",
        "qualifikationen": [],
        "datum": "2026-01-01"
    }
	]
};

// Call createReport from docx-templates
const result = await createReport({ template, data, cmdDelimiter: ['{{', '}}'] });

// createReport may return a Buffer, Uint8Array or ArrayBuffer — normalize to Buffer
const out = Buffer.isBuffer(result) ? result : Buffer.from(result as Uint8Array);

// Write output file
await Bun.write('src/test/bericht_test.docx', out);

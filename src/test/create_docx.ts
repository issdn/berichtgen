import { Ort } from '$src/lib/enums';
import { writeDocxFile } from '$src/lib/utils/write_docx';

const docx = await writeDocxFile([
	{
		qualifikationen: ['Sonstige Qualifikation', 'Sonstige Qualifikation'],
		text: 'Dies ist ein Beispieltext für den Bericht.',
		ort: Ort.BETRIEB,
		datum: '2023-10-01',
		hours: 40
	}
]);

await Bun.write('exemple_doc.docx', docx);

import { Ort } from '$src/lib/types';
import { writeDocxFile } from '$src/lib/utils/write_docx';

const docx = await writeDocxFile([
	{
		qualifikationen: ['Qualifikation 1', 'Qualifikation 2'],
		text: 'Dies ist ein Beispieltext für den Bericht.',
		ort: Ort.BETRIEB,
		datum: '2023-10-01'
	}
]);

await Bun.write('exemple_doc.docx', docx);

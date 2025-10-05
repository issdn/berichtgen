import createReport from 'docx-templates';
import { Ort } from '$src/lib/enums';

const report = await createReport({
	template: await Bun.file('static/base_template.docx').bytes(),
	data: {
		berichte: [
			{
				qualifikationen: ['Sonstige Qualifikation', 'Sonstige Qualifikation'],
				text: 'Dies ist ein Beispieltext für den Bericht. ',
				ort: Ort.BETRIEB,
				datum: '2023-10-01',
				hours: 40
			},
			{
				qualifikationen: ['Sonstige Qualifikation', 'Sonstige Qualifikation'],
				text: 'Dies ist ein Beispieltext für den Bericht. ',
				ort: Ort.SCHULE,
				datum: '2023-10-02',
				hours: 8
			}
		]
	},
	cmdDelimiter: ['{', '}']
});

await Bun.write('src/test/bericht_test.docx', report);

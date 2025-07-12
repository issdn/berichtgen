import { Document, Packer, TableRow, Table, TableCell, Paragraph } from 'docx';
import type { ResultEntry } from '$src/lib/types';
import { Ort } from '$src/lib/enums';

function header(text: string) {
	return new TableRow({
		height: { value: '10mm', rule: 'exact' },
		children: [
			new TableCell({
				verticalAlign: 'center',
				shading: { fill: 'D1D1D1' },
				width: { size: '90%' },
				children: [new Paragraph({ style: 'normal', text })]
			}),
			new TableCell({
				verticalAlign: 'center',
				shading: { fill: 'D1D1D1' },
				children: [new Paragraph({ style: 'normal', text: 'Stunden', alignment: 'center' })]
			})
		]
	});
}

function splitTextByDoubleNewlines(text: string): string[] {
	return text
		.split(/\r?\n\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

function emptyRow(text: string | null = null, hours: number | null = null) {
	const splittedByDoubleNewline = text ? splitTextByDoubleNewlines(text) : [];
	const textParagraphs = splittedByDoubleNewline.map(
		(text) =>
			new Paragraph({ text, bullet: splittedByDoubleNewline.length > 1 ? { level: 0 } : undefined })
	);
	return new TableRow({
		children: [
			new TableCell({ width: { size: '90%' }, children: textParagraphs }),
			new TableCell({
				children: hours ? [new Paragraph({ text: hours.toString(), alignment: 'center' })] : []
			})
		]
	});
}

function createBerichtTable(text: string, hours: number, ort: Ort) {
	return new Table({
		margins: {
			top: 24
		},
		width: { size: '100%' },
		rows: [
			header('Betriebliche Tätigkeiten'),
			ort === Ort.BETRIEB ? emptyRow(text, hours) : emptyRow(),
			header('Unterweisungen, betrieblicher Unterricht, sonstige Schulungen'),
			ort === Ort.UNTERWEISUNG ? emptyRow(text, hours) : emptyRow(),
			header('Themen des Berufsschulunterricht'),
			ort === Ort.SCHULE ? emptyRow(text, hours) : emptyRow()
		]
	});
}

function createPersonTable(datum: string) {
	return new Table({
		width: { size: '100%' },
		rows: [
			new TableRow({
				children: [
					new TableCell({
						width: { size: '33%' },
						children: [new Paragraph({ text: 'Name des/der Auszubildenden:' })]
					}),
					new TableCell({ children: [], columnSpan: 4 })
				]
			}),
			new TableRow({
				children: [
					new TableCell({
						width: { size: '33%' },
						children: [new Paragraph({ text: 'Ausbildungsjahr:' })]
					}),
					new TableCell({ width: { size: '20%' }, children: [] }),
					new TableCell({
						width: { size: '28%' },
						children: [new Paragraph({ text: 'Ggf. ausbildende Abteilung:' })]
					}),
					new TableCell({ width: { size: '20%' }, children: [] })
				]
			}),
			new TableRow({
				children: [
					new TableCell({
						width: { size: '33%' },
						children: [new Paragraph({ text: 'Ausbildungswoche vom:' })]
					}),
					new TableCell({
						width: { size: '20%' },
						children: [new Paragraph({ text: datum, alignment: 'center' })]
					}),
					new TableCell({ width: { size: '28%' }, children: [new Paragraph({ text: 'bis:' })] }),
					new TableCell({ width: { size: '20%' }, children: [] })
				]
			})
		]
	});
}

function gapRow(gap: number = 10, content: string | null = null) {
	return new TableRow({
		height: { value: `${gap}mm`, rule: 'atLeast' },
		children: [
			new TableCell({
				borders: {
					top: { style: 'nil' },
					bottom: { style: 'nil' },
					left: { style: 'nil' },
					right: { style: 'nil' }
				},
				columnSpan: 3,
				width: { size: '100%' },
				children: content ? [new Paragraph({ text: content, style: 'secondaryBig' })] : []
			})
		]
	});
}

function createSignatureRow(text1: string | null, text2: string | null, sign: boolean = true) {
	return new TableRow({
		children: [
			new TableCell({
				margins: { top: 24 },
				width: { size: '45%' },
				borders: {
					top: { style: text1 !== null && sign ? 'dashed' : 'nil', color: 'ADADAD' },
					bottom: { style: 'nil' },
					left: { style: 'nil' },
					right: { style: 'nil' }
				},
				children:
					text1 === null
						? []
						: [new Paragraph({ style: sign ? 'secondary' : 'secondaryBig', text: text1 })]
			}),
			new TableCell({
				margins: { top: 24 },
				width: { size: '10%' },
				borders: {
					top: { style: 'nil' },
					bottom: { style: 'nil' },
					left: { style: 'nil' },
					right: { style: 'nil' }
				},
				children: []
			}),
			new TableCell({
				margins: { top: 24 },
				width: { size: '45%' },
				borders: {
					top: { style: text2 !== null && sign ? 'dashed' : 'nil', color: 'ADADAD' },
					bottom: { style: 'nil' },
					left: { style: 'nil' },
					right: { style: 'nil' }
				},
				children:
					text2 === null
						? []
						: [new Paragraph({ style: sign ? 'secondary' : 'secondaryBig', text: text2 })]
			})
		]
	});
}

function createSignaturesTable() {
	return new Table({
		width: { size: '100%' },
		rows: [
			gapRow(
				2,
				'Durch die nachfolgende Unterschrift wird die Richtigkeit und Vollständigkeit der obigen Angaben bestätigt.'
			),
			gapRow(),
			createSignatureRow('Datum, Unterschrift Auszubildende/r', 'Datum, Unterschrift Ausbilder/in'),
			gapRow(5),
			createSignatureRow('Zur Kenntnis genommen:', 'Sonstige Sichtvermerke:', false),
			gapRow(),
			createSignatureRow(
				'Datum, Unterschrift gesetzliche/r Vertreter/in',
				'Datum, Unterschrift Betriebsrat'
			),
			gapRow(),
			createSignatureRow(null, 'Datum, Unterschrift Berufsschule')
		]
	});
}

export async function writeDocxFile(entries: ResultEntry[]) {
	const weeklyTables = entries.map(({ text, ort, datum, hours }) => {
		return [
			createPersonTable(datum),
			createBerichtTable(text, hours, ort),
			createSignaturesTable()
		];
	});

	const doc = new Document({
		styles: {
			paragraphStyles: [
				{
					id: 'normal',
					name: 'normal',
					run: { font: 'Aptos (Body)', size: '10pt' }
				},
				{
					id: 'secondary',
					name: 'secondary',
					run: { font: 'Aptos (Body)', size: '9pt', color: 'ADADAD' }
				},
				{
					id: 'secondaryBig',
					name: 'secondaryBig',
					run: { font: 'Aptos (Body)', size: '10pt', color: 'ADADAD', bold: true }
				}
			]
		},
		sections: weeklyTables.flat().map((table) => ({
			properties: {
				type: 'continuous'
			},
			children: [table]
		}))
	});

	return await Packer.toBlob(doc);
}

export async function handleDOCXDownload(
	entries: Promise<ResultEntry[]>,
	download: string = 'bericht.docx'
) {
	const blob = await writeDocxFile(await entries);
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');

	a.href = url;
	a.download = download;
	document.body.appendChild(a);
	a.click();

	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

import { Document, Packer, TableRow, Table, TableCell, Paragraph } from 'docx';
import type { ResultEntry } from '$src/lib/types';

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
				children: [new Paragraph({ style: 'normal', text: 'Stunden' })]
			})
		]
	});
}

function emptyRow() {
	return new TableRow({
		children: [
			new TableCell({ width: { size: '90%' }, children: [] }),
			new TableCell({ children: [] })
		]
	});
}

function createBerichtTable() {
	return new Table({
		margins: {
			top: 24
		},
		width: { size: '100%' },
		rows: [
			header('Betriebliche Tätigkeiten'),
			emptyRow(),
			header('Unterweisungen, betrieblicher Unterricht, sonstige Schulungen'),
			emptyRow(),
			header('Themen des Berufsschulunterricht'),
			emptyRow()
		]
	});
}

function createPersonTable() {
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
					new TableCell({ width: { size: '20%' }, children: [] }),
					new TableCell({ width: { size: '28%' }, children: [new Paragraph({ text: 'bis:' })] }),
					new TableCell({ width: { size: '20%' }, children: [] })
				]
			})
		]
	});
}

export async function writeDocxFile(entries: ResultEntry[]) {
	const weeklyTables = entries.map((entry) => {
		const qualifikationenText = entry.qualifikationen.join(', ');

		return [createPersonTable(), createBerichtTable()];
	});

	// Create the document
	const doc = new Document({
		styles: {
			paragraphStyles: [
				{
					id: 'normal',
					name: 'normal',
					run: { font: 'Aptos (Body)', size: '10pt' }
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

	// Generate the .docx file
	return await Packer.toBlob(doc);
}

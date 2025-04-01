import { spreadEntriesAcrossWeeks } from '$lib/parse/time_spread';
import { parseDate } from '@internationalized/date';
import { expect, test } from 'bun:test';

test('Spread multiple entries across multiple weeks.', () => {
	const entries = [
		{
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			qualifikationen: ['Betriebswirtschaft'],
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		},
		{
			qualifikationen: ['Betriebswirtschaft'],
			text: 'Risikomanagement in der Lieferkette:\nIdentifikation und Bewertung von Risiken bei der Zusammenarbeit mit Lieferanten.'
		}
	];

	const expected = [
		{
			datum: '2025-03-03',
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			datum: '2025-03-10',
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			datum: '2025-03-17',
			qualifikationen: ['Betriebswirtschaft'],
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		},
		{
			datum: '2025-03-17',
			qualifikationen: ['Betriebswirtschaft'],
			text: 'Risikomanagement in der Lieferkette:\nIdentifikation und Bewertung von Risiken bei der Zusammenarbeit mit Lieferanten.'
		}
	];

	expect(
		spreadEntriesAcrossWeeks(entries, [
			{
				daterange: {
					start: parseDate('2025-03-04'),
					end: parseDate('2025-03-17')
				}
			}
		])
	).toMatchSnapshot(expected);
});

test('Spread one entry across multiple weeks.', () => {
	const entries = [
		{
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		}
	];

	const expected = [
		{
			datum: '2025-03-03',
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		}
	];

	expect(
		spreadEntriesAcrossWeeks(entries, [
			{
				daterange: {
					start: parseDate('2025-03-04'),
					end: parseDate('2025-03-24')
				}
			}
		])
	).toMatchSnapshot(expected);
});

test('Spread multiple entries across one week.', () => {
	const entries = [
		{
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			qualifikationen: ['Betriebswirtschaft'],
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		}
	];

	const expected = [
		{
			datum: '2025-03-03',
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			datum: '2025-03-03',
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			datum: '2025-03-03',
			qualifikationen: ['Betriebswirtschaft'],
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		}
	];

	expect(
		spreadEntriesAcrossWeeks(entries, [
			{
				daterange: {
					start: parseDate('2025-03-04'),
					end: parseDate('2025-03-05')
				}
			}
		])
	).toMatchSnapshot(expected);
});

test('Spread multiple entries across multiple week ranges.', () => {
	const entries = [
		{
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			qualifikationen: ['Betriebswirtschaft'],
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		}
	];

	const expected = [
		{
			datum: '2025-03-03',
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			datum: '2025-04-07',
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			datum: '2025-04-07',
			qualifikationen: ['Betriebswirtschaft'],
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		}
	];

	expect(
		spreadEntriesAcrossWeeks(entries, [
			{
				daterange: {
					start: parseDate('2025-03-04'),
					end: parseDate('2025-03-05')
				}
			},
			{
				daterange: {
					start: parseDate('2025-04-07'),
					end: parseDate('2025-04-08')
				}
			}
		])
	).toMatchSnapshot(expected);
});

test('Spread multiple entries across multiple week ranges.', () => {
	const entries = [
		{
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			qualifikationen: ['Betriebswirtschaft'],
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		},
		{
			qualifikationen: ['Betriebswirtschaft'],
			text: 'Lieferantencontrolling:\nMethoden und Kennzahlen zur Überwachung und Steuerung der Lieferantenleistung.'
		},
		{
			qualifikationen: ['Betriebswirtschaft'],
			text: 'Global Sourcing:\nVor- und Nachteile der weltweiten Beschaffung von Gütern und Dienstleistungen.'
		}
	];

	const expected = [
		{
			datum: '2025-03-03',
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			datum: '2025-03-03',
			qualifikationen: ['Allgemeinbildende Fächer'],
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			datum: '2025-03-03',
			qualifikationen: ['Betriebswirtschaft'],
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		},
		{
			datum: '2025-04-07',
			qualifikationen: ['Betriebswirtschaft'],
			text: 'Lieferantencontrolling:\nMethoden und Kennzahlen zur Überwachung und Steuerung der Lieferantenleistung.'
		},
		{
			datum: '2025-04-07',
			qualifikationen: ['Betriebswirtschaft'],
			text: 'Global Sourcing:\nVor- und Nachteile der weltweiten Beschaffung von Gütern und Dienstleistungen.'
		}
	];

	expect(
		spreadEntriesAcrossWeeks(entries, [
			{
				daterange: {
					start: parseDate('2025-03-03'),
					end: parseDate('2025-03-05')
				},
				hours: 30
			},
			{
				daterange: {
					start: parseDate('2025-04-07'),
					end: parseDate('2025-04-08')
				},
				hours: 20
			}
		])
	).toMatchSnapshot(expected);
});

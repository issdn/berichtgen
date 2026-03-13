import { spreadEntriesAcrossWeeks } from '$lib/parse/time_spread';
import { Ort } from '$src/lib/enums';
import { QualifikationenBetrieb } from '$src/lib/constants';
import { testAIResponse } from '$src/test/test_inputs';
import { parseDate } from '@internationalized/date';
import { expect, test } from 'vitest';

const qualifikationen = [QualifikationenBetrieb[0]];

test('Spread single entry across multiple weeks.', () => {
	const entries = [
		{
			datum: '2025-03-24',
			qualifikationen,
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		}
	];

	const expected = [
		{
			datum: '2025-03-24',
			qualifikationen,
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		}
	];

	const received = spreadEntriesAcrossWeeks(entries, {
		ort: Ort.BETRIEB,
		ranges: [
			{
				daterange: {
					start: parseDate('2025-03-25'),
					end: parseDate('2025-04-01')
				}
			}
		]
	});

	received.forEach((o, i) => expect(o).toMatchObject(expected[i]));
});

test('Spread multiple entries across multiple weeks.', () => {
	const entries = [
		{
			qualifikationen,
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			qualifikationen,
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			qualifikationen,
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		},
		{
			qualifikationen,
			text: 'Risikomanagement in der Lieferkette:\nIdentifikation und Bewertung von Risiken bei der Zusammenarbeit mit Lieferanten.'
		}
	];

	const expected = [
		{
			datum: '2025-03-03',
			qualifikationen,
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			datum: '2025-03-10',
			qualifikationen,
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			datum: '2025-03-17',
			qualifikationen,
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		},
		{
			datum: '2025-03-17',
			qualifikationen,
			text: 'Risikomanagement in der Lieferkette:\nIdentifikation und Bewertung von Risiken bei der Zusammenarbeit mit Lieferanten.'
		}
	];

	const received = spreadEntriesAcrossWeeks(entries, {
		ranges: [
			{
				daterange: {
					start: parseDate('2025-03-04'),
					end: parseDate('2025-03-17')
				}
			}
		],
		ort: Ort.BETRIEB
	});

	received.forEach((o, i) => expect(o).toMatchObject(expected[i]));
});

test('Spread one entry across multiple weeks.', () => {
	const entries = [
		{
			qualifikationen,
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		}
	];

	const expected = [
		{
			datum: '2025-03-03',
			qualifikationen,
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		}
	];

	const received = spreadEntriesAcrossWeeks(entries, {
		ranges: [
			{
				daterange: {
					start: parseDate('2025-03-04'),
					end: parseDate('2025-03-24')
				}
			}
		],
		ort: Ort.BETRIEB
	});

	received.forEach((o, i) => expect(o).toMatchObject(expected[i]));
});

test('Spread multiple entries across one week.', () => {
	const entries = [
		{
			qualifikationen,
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			qualifikationen,
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			qualifikationen,
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		}
	];

	const expected = [
		{
			datum: '2025-03-03',
			qualifikationen,
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			datum: '2025-03-03',
			qualifikationen,
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			datum: '2025-03-03',
			qualifikationen,
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		}
	];

	const received = spreadEntriesAcrossWeeks(entries, {
		ranges: [
			{
				daterange: {
					start: parseDate('2025-03-04'),
					end: parseDate('2025-03-05')
				}
			}
		],
		ort: Ort.BETRIEB
	});

	received.forEach((o, i) => expect(o).toMatchObject(expected[i]));
});

test('Spread multiple entries across multiple week ranges.', () => {
	const entries = [
		{
			qualifikationen,
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			qualifikationen,
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			qualifikationen,
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		}
	];

	const expected = [
		{
			datum: '2025-03-03',
			qualifikationen,
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			datum: '2025-03-03',
			qualifikationen,
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			datum: '2025-04-07',
			qualifikationen,
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		}
	];

	const received = spreadEntriesAcrossWeeks(entries, {
		ranges: [
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
		],
		ort: Ort.BETRIEB
	});
	received.forEach((o, i) => expect(o).toMatchObject(expected[i]));
});

test('spreads more entries than available weeks across multiple ranges with hours', () => {
	const entries = [
		{
			qualifikationen,
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			qualifikationen,
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			qualifikationen,
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		},
		{
			qualifikationen,
			text: 'Lieferantencontrolling:\nMethoden und Kennzahlen zur Überwachung und Steuerung der Lieferantenleistung.'
		},
		{
			qualifikationen,
			text: 'Global Sourcing:\nVor- und Nachteile der weltweiten Beschaffung von Gütern und Dienstleistungen.'
		}
	];

	const expected = [
		{
			datum: '2025-03-03',
			qualifikationen,
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			datum: '2025-03-03',
			qualifikationen,
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			datum: '2025-03-03',
			qualifikationen,
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		},
		{
			datum: '2025-04-07',
			qualifikationen,
			text: 'Lieferantencontrolling:\nMethoden und Kennzahlen zur Überwachung und Steuerung der Lieferantenleistung.'
		},
		{
			datum: '2025-04-07',
			qualifikationen,
			text: 'Global Sourcing:\nVor- und Nachteile der weltweiten Beschaffung von Gütern und Dienstleistungen.'
		}
	];

	const received = spreadEntriesAcrossWeeks(entries, {
		ranges: [
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
		],
		ort: Ort.BETRIEB
	});

	received.forEach((o, i) => expect(o).toMatchObject(expected[i]));
});

test('Spread multiple entries across multiple week ranges with hours.', () => {
	const received = spreadEntriesAcrossWeeks(testAIResponse, {
		ranges: [
			{
				daterange: {
					start: parseDate('2023-12-01'),
					end: parseDate('2024-01-01')
				},
				hours: 30
			}
		],
		ort: Ort.BETRIEB
	});

	expect(received.length).toBe(testAIResponse.length);
});

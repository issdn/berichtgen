import { Ort } from '$wizard/enums';
import { spreadEntriesAcrossWeeks } from '$wizard/postprocess/time_spread';
import { parseDate } from '@internationalized/date';
import { expect, test } from 'vitest';

import { testAIResponse } from '../../../../test/helpers/test_inputs';

test('Spread single entry across multiple weeks.', () => {
	const entries = [
		'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
	];

	const expected = [
		{
			datum: '2025-03-24',
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		}
	];

	const received = spreadEntriesAcrossWeeks(entries, {
		ort: Ort.BETRIEB,
		ranges: [
			{
				daterange: {
					end: parseDate('2025-04-01'),
					start: parseDate('2025-03-25')
				}
			}
		]
	});

	received.forEach((o, i) => expect(o).toMatchObject(expected[i]));
});

test('Spread multiple entries across multiple weeks.', () => {
	const entries = [
		'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.',
		'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.',
		'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.',
		'Risikomanagement in der Lieferkette:\nIdentifikation und Bewertung von Risiken bei der Zusammenarbeit mit Lieferanten.'
	];

	const expected = [
		{
			datum: '2025-03-03',
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			datum: '2025-03-10',
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			datum: '2025-03-17',
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		},
		{
			datum: '2025-03-17',
			text: 'Risikomanagement in der Lieferkette:\nIdentifikation und Bewertung von Risiken bei der Zusammenarbeit mit Lieferanten.'
		}
	];

	const received = spreadEntriesAcrossWeeks(entries, {
		ort: Ort.BETRIEB,
		ranges: [
			{
				daterange: {
					end: parseDate('2025-03-17'),
					start: parseDate('2025-03-04')
				}
			}
		]
	});

	received.forEach((o, i) => expect(o).toMatchObject(expected[i]));
});

test('Spread one entry across multiple weeks.', () => {
	const entries = [
		'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
	];

	const expected = [
		{
			datum: '2025-03-03',
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		}
	];

	const received = spreadEntriesAcrossWeeks(entries, {
		ort: Ort.BETRIEB,
		ranges: [
			{
				daterange: {
					end: parseDate('2025-03-24'),
					start: parseDate('2025-03-04')
				}
			}
		]
	});

	received.forEach((o, i) => expect(o).toMatchObject(expected[i]));
});

test('Spread multiple entries across one week.', () => {
	const entries = [
		'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.',
		'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.',
		'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
	];

	const expected = [
		{
			datum: '2025-03-03',
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			datum: '2025-03-03',
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			datum: '2025-03-03',
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		}
	];

	const received = spreadEntriesAcrossWeeks(entries, {
		ort: Ort.BETRIEB,
		ranges: [
			{
				daterange: {
					end: parseDate('2025-03-05'),
					start: parseDate('2025-03-04')
				}
			}
		]
	});

	received.forEach((o, i) => expect(o).toMatchObject(expected[i]));
});

test('Spread multiple entries across multiple week ranges.', () => {
	const entries = [
		'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.',
		'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.',
		'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
	];

	const expected = [
		{
			datum: '2025-03-03',
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			datum: '2025-03-03',
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			datum: '2025-04-07',
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		}
	];

	const received = spreadEntriesAcrossWeeks(entries, {
		ort: Ort.BETRIEB,
		ranges: [
			{
				daterange: {
					end: parseDate('2025-03-05'),
					start: parseDate('2025-03-04')
				}
			},
			{
				daterange: {
					end: parseDate('2025-04-08'),
					start: parseDate('2025-04-07')
				}
			}
		]
	});
	received.forEach((o, i) => expect(o).toMatchObject(expected[i]));
});

test('spreads more entries than available weeks across multiple ranges with stunden', () => {
	const entries = [
		'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.',
		'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.',
		'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.',
		'Lieferantencontrolling:\nMethoden und Kennzahlen zur Überwachung und Steuerung der Lieferantenleistung.',
		'Global Sourcing:\nVor- und Nachteile der weltweiten Beschaffung von Gütern und Dienstleistungen.'
	];

	const expected = [
		{
			datum: '2025-03-03',
			text: 'Prozesskette Lieferantenmanagement:\nDie verschiedenen Schritte im Lieferantenmanagement von der Analyse bis zur Auswahl.'
		},
		{
			datum: '2025-03-03',
			text: 'Kriterien zur Analyse und Auswahl von Lieferanten:\nDie verschiedenen Kriterien zur Bewertung von Lieferanten wie Zuverlässigkeit, Fertigungsmöglichkeiten und Konditionen.'
		},
		{
			datum: '2025-03-03',
			text: 'Lieferantenbeziehungsmanagement:\nLangfristige Strategien zur Pflege von Geschäftsbeziehungen mit Lieferanten.'
		},
		{
			datum: '2025-04-07',
			text: 'Lieferantencontrolling:\nMethoden und Kennzahlen zur Überwachung und Steuerung der Lieferantenleistung.'
		},
		{
			datum: '2025-04-07',
			text: 'Global Sourcing:\nVor- und Nachteile der weltweiten Beschaffung von Gütern und Dienstleistungen.'
		}
	];

	const received = spreadEntriesAcrossWeeks(entries, {
		ort: Ort.BETRIEB,
		ranges: [
			{
				daterange: {
					end: parseDate('2025-03-05'),
					start: parseDate('2025-03-03')
				},
				stunden: 30
			},
			{
				daterange: {
					end: parseDate('2025-04-08'),
					start: parseDate('2025-04-07')
				},
				stunden: 20
			}
		]
	});

	received.forEach((o, i) => expect(o).toMatchObject(expected[i]));
});

test('Spread multiple entries across multiple week ranges with stunden.', () => {
	const received = spreadEntriesAcrossWeeks(
		testAIResponse.map((entry) => entry.text),
		{
			ort: Ort.BETRIEB,
			ranges: [
				{
					daterange: {
						end: parseDate('2024-01-01'),
						start: parseDate('2023-12-01')
					},
					stunden: 30
				}
			]
		}
	);

	expect(received.length).toBe(testAIResponse.length);
});

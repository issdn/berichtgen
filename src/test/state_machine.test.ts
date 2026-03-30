import { describe, test, expect, vi } from 'vitest';
import { WizardStep } from '$wizard/enums';
import { CalendarDate } from '@internationalized/date';
import { okResult } from '$lib/result';
import type { Scheduler } from 'tesseract.js';

// ---------------------------------------------------------------------------
// Infrastructure mocks — things that cannot run outside a browser/SvelteKit
// ---------------------------------------------------------------------------

vi.mock('$app/navigation', () => ({ invalidate: vi.fn() }));
vi.mock('$lib/stores/berichtgen.svelte', () => ({
	berichtgenStore: { rewordJSON: false, processPhotos: false, constantHours: 8 }
}));

// Mock the parse service so the state-machine test only exercises state
// transitions, not actual file parsing. Parsing correctness is covered by
// parse_service.test.ts.
const mockParseFile = vi.hoisted(() => vi.fn());
vi.mock('$core/parser/parse_service', () => ({ parseFile: mockParseFile }));

// ---------------------------------------------------------------------------
// The single behavioral mock: the HTTP completion endpoint
// Everything else in the completion module (sanitize, split, batch, stringsToEntries) runs real.
// ---------------------------------------------------------------------------

const mockSendBatch = vi.hoisted(() => vi.fn());
vi.mock('$wizard/completion/completion', async (importOriginal) => ({
	...((await importOriginal()) as object),
	sendBatchCompletion: mockSendBatch
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { WizardScheduler } from '$wizard/services/wizard_scheduler.svelte';
import type { DateRangeSchema } from '$wizard/schemas';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function flush() {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

const DUMMY_TEXT = 'Montag: Programmieren';
const AI_RESULT = 'KI: Montag: Programmieren';

describe('State machine full lifecycle', () => {
	test('INITIALISING → PROCESSING → WAITING → BATCH_PENDING → AI_COMPLETION → TIME_SPREADING → DONE', async () => {
		// The parse service returns the file content instantly.
		mockParseFile.mockResolvedValue(okResult(DUMMY_TEXT));

		// The mocked server responds instantly with a prefixed version of the text.
		mockSendBatch.mockResolvedValue(
			okResult({ results: [[AI_RESULT]], insufficient_tokens: false })
		);

		// Real WizardScheduler — parse_service is mocked so no OCR workers needed.
		const scheduler = new WizardScheduler();
		scheduler.scheduler = {
			terminate: () => Promise.resolve()
		} as unknown as Scheduler;

		// Create the schedule with a single plain-text file.
		const file = new File([DUMMY_TEXT], 'test.txt', { type: 'text/plain' });
		scheduler.createSchedule([[{ file }]]);

		const { context, machine } = scheduler.schedule![0];

		// Track the current FSM state via store subscription.
		let currentState = WizardStep.INITIALISING as string;
		machine.subscribe((s: string) => {
			currentState = s;
		});

		// 1. Kick off: INITIALISING → PROCESSING
		expect(currentState).toBe(WizardStep.INITIALISING);
		scheduler.enqueue(scheduler.schedule![0]);

		// 2. Wait for parseFile to resolve (mocked as an instantly-resolving promise).
		await flush();

		// 3. PROCESSING finished — snapshot holds the decoded file content, machine waits for date config.
		expect(currentState).toBe(WizardStep.WAITING);
		expect(context.snapshot).toBe(DUMMY_TEXT);

		// 4. Provide real date ranges (real CalendarDate objects for real spreadEntriesAcrossWeeks).
		context.dateRanges = {
			ort: 'BETRIEB',
			ranges: [
				{
					id: 0,
					daterange: {
						start: new CalendarDate(2024, 1, 1),
						end: new CalendarDate(2024, 1, 14)
					},
					stunden: null
				}
			]
		} as unknown as DateRangeSchema;

		// WAITING → BATCH_PENDING → checkBatchReady fires → runBatches → mocked endpoint.
		machine.next();

		// 5+6. Wait for the async endpoint call + TIME_SPREADING + DONE.
		await flush();

		// 7. Machine reached DONE with the AI-prefixed text preserved through TIME_SPREADING.
		expect(currentState).toBe(WizardStep.DONE);
		expect(context.finished![0].text).toBe(AI_RESULT);
	});
});

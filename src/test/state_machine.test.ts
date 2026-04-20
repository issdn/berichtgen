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
	default: {
		get: (key: keyof App.***REMOVED***Settings) => {
			const values: App.***REMOVED***Settings = {
				rewordJSON: false,
				processPhotos: false,
				constantHours: false,
				useDevEndpoint: false,
				preferredTemplatePath: null,
				tempEmailContainer: null
			};
			return values[key];
		},
		set: vi.fn()
	}
}));

// Mock resolveFileRouting so the state-machine test only exercises state
// transitions, not actual file routing/parsing/uploading.
// Routing correctness is covered separately.
const mockResolveFileRouting = vi.hoisted(() => vi.fn());
vi.mock('$wizard/services/file_routing', async (importOriginal) => ({
	...((await importOriginal()) as object),
	resolveFileRouting: mockResolveFileRouting
}));

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
		// resolveFileRouting returns an inline routing instantly (simulates a small file).
		mockResolveFileRouting.mockResolvedValue(
			okResult({ type: 'inline', data: btoa(DUMMY_TEXT), mimeType: 'text/plain' })
		);

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

		// 3. PROCESSING finished — snapshot holds the inline routing descriptor, machine waits for date config.
		expect(currentState).toBe(WizardStep.WAITING);
		expect(context.snapshot).toMatchObject({
			type: 'inline',
			mimeType: 'text/plain'
		});

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

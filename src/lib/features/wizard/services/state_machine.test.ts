import { okResult } from '$lib/result';
import { WizardStep } from '$wizard/enums';
import { CalendarDate } from '@internationalized/date';
import { describe, expect, test, vi } from 'vitest';

vi.mock('$app/navigation', () => ({ invalidate: vi.fn() }));
vi.mock('$core/stores/berichtgen.svelte', () => ({
	default: {
		get: (key: keyof App.BerichtgenSettings) => {
			const values: App.BerichtgenSettings = {
				constantHours: false,
				preferredTemplatePath: null,
				rewordJSON: false,
				tempEmailContainer: null
			};
			return values[key];
		},
		set: vi.fn()
	}
}));

const mockResolveFileRouting = vi.hoisted(() => vi.fn());
vi.mock('$wizard/services/file_routing', async (importOriginal) => ({
	...((await importOriginal()) as object),
	resolveFileRouting: mockResolveFileRouting
}));

const mockSendBatch = vi.hoisted(() => vi.fn());
vi.mock('$wizard/completion/completion', async (importOriginal) => ({
	...((await importOriginal()) as object),
	sendBatchCompletion: mockSendBatch
}));

import type { DateRangeSchema } from '$wizard/schemas';

import { WizardMediator } from '$wizard/services/wizard_mediator.svelte';

function flush() {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

const DUMMY_TEXT = 'Montag: Programmieren';
const AI_RESULT = 'KI: Montag: Programmieren';

describe('State machine full lifecycle', () => {
	test('INITIALISING -> PROCESSING -> WAITING -> BATCH_PENDING -> AI_COMPLETION -> TIME_SPREADING -> DONE', async () => {
		mockResolveFileRouting.mockResolvedValue(
			okResult({
				data: btoa(DUMMY_TEXT),
				mimeType: 'text/plain',
				type: 'inline'
			})
		);

		mockSendBatch.mockResolvedValue(
			okResult({ insufficient_tokens: false, results: [[AI_RESULT]] })
		);

		const scheduler = WizardMediator.createDefault();
		const file = new File([DUMMY_TEXT], 'test.txt', { type: 'text/plain' });
		scheduler.createSchedule([[{ file }]]);

		const { context, machine } = scheduler.schedule![0];

		expect(machine.current).toBe(WizardStep.PROCESSING);

		await flush();

		expect(machine.current).toBe(WizardStep.WAITING);
		expect(context.snapshot).toMatchObject({
			mimeType: 'text/plain',
			type: 'inline'
		});

		context.dateRanges = {
			ort: 'BETRIEB',
			ranges: [
				{
					daterange: {
						end: new CalendarDate(2024, 1, 14),
						start: new CalendarDate(2024, 1, 1)
					},
					id: 0,
					stunden: null
				}
			]
		} as unknown as DateRangeSchema;

		machine.send('next');
		await scheduler.flushAiCompletion();
		await flush();

		expect(machine.current).toBe(WizardStep.DONE);
		expect(context.finished![0].text).toBe(AI_RESULT);
	});
});

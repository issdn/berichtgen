// @vitest-environment jsdom
import type { WizardPersistenceController } from '$core/persistence/wizard_persistence_controller.svelte';
import type { DateRangeSchema } from '$wizard/schemas';

import { okResult } from '$lib/result';
import { WizardStep } from '$wizard/enums';
import { WizardMediator } from '$wizard/services/wizard_mediator.svelte';
import { CalendarDate } from '@internationalized/date';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('$app/navigation', () => ({ invalidate: vi.fn() }));
vi.mock('$core/stores/berichtgen.svelte', () => ({
	default: {
		get: (key: keyof App.BerichtgenSettings) => {
			const values: App.BerichtgenSettings = {
				constantHours: false,
				preferredTemplatePath: null,
				preferredWizardDownloadType: null,
				rewordJSON: false,
				tempEmailContainer: null
			};
			return values[key];
		},
		set: vi.fn()
	}
}));

const mockSendBatch = vi.hoisted(() => vi.fn());
const mockUploadToGcs = vi.hoisted(() => vi.fn());
vi.mock('$wizard/api/wizard.remote', () => ({
	submitBatchCompletionCommand: mockSendBatch
}));
vi.mock('$wizard/services/gcs_service', () => ({
	uploadToGcs: mockUploadToGcs
}));

function flush() {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

const DUMMY_TEXT = 'Montag: Programmieren';
const AI_RESULT = 'KI: Montag: Programmieren';

function createPersistenceMock(): WizardPersistenceController {
	return {
		clearWizardSession: vi.fn(async () => {}),
		isRehydrating: false,
		loadWizardSession: vi.fn(async () => null),
		mutation: null,
		saveWizardSession: vi.fn(async () => {}),
		status: 'loading'
	} as unknown as WizardPersistenceController;
}

function createDateRanges(): DateRangeSchema {
	return {
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
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('State machine full lifecycle', () => {
	test('INITIALISING -> WAITING -> PROCESSING -> BATCH_PENDING -> AI_COMPLETION -> TIME_SPREADING -> DONE', async () => {
		mockSendBatch.mockResolvedValue({
			insufficient_tokens: false,
			results: [[AI_RESULT]]
		});

		const scheduler = WizardMediator.createDefault({
			persistence: createPersistenceMock(),
			userId: null
		});
		const file = new File([DUMMY_TEXT], 'test.txt', { type: 'text/plain' });
		scheduler.createSchedule([[file]]);

		const { context, machine } = scheduler.schedule![0];

		expect(machine.current).toBe(WizardStep.WAITING);

		context.dateRanges = createDateRanges();

		machine.send('next');
		await flush();

		expect(machine.current).toBe(WizardStep.BATCH_PENDING);
		expect(context.snapshot).toMatchObject({
			mimeType: 'text/plain',
			type: 'inline'
		});
		await scheduler.flushAiCompletion();
		await flush();

		expect(machine.current).toBe(WizardStep.DONE);
		expect(Array.isArray(context.snapshot)).toBe(true);
		expect((context.snapshot as Array<{ text: string }>)[0].text).toContain(
			AI_RESULT
		);
	});

	test('JSON completion input skips AI and produces dated entries after TIME_SPREADING', async () => {
		const completionPayload = ['Tag 1: API gebaut.', 'Tag 2: Tests ergänzt.'];
		const jsonFile = new File(
			[JSON.stringify(completionPayload)],
			'input.json',
			{
				type: 'application/json'
			}
		);

		const scheduler = WizardMediator.createDefault({
			persistence: createPersistenceMock(),
			userId: null
		});
		scheduler.createSchedule([[jsonFile]]);

		const { context, machine } = scheduler.schedule![0];
		expect(machine.current).toBe(WizardStep.WAITING);

		context.dateRanges = createDateRanges();

		machine.send('next');
		await flush();

		expect(machine.current).toBe(WizardStep.DONE);
		expect(Array.isArray(context.snapshot)).toBe(true);

		const dated = context.snapshot as Array<{
			ausbildungsjahr: number;
			datum: string;
			endDatum: string;
			ort: string;
			stunden: number;
			text: string;
		}>;

		expect(dated).toHaveLength(2);
		expect(dated[0].text).toContain('Tag 1: API gebaut.');
		expect(dated[1].text).toContain('Tag 2: Tests ergänzt.');
		expect(dated[0].ort).toBe('BETRIEB');
		expect(dated[1].ort).toBe('BETRIEB');
		expect(dated[0].stunden).toBeGreaterThan(0);
		expect(dated[1].stunden).toBeGreaterThan(0);
		expect(dated[0].datum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(dated[1].datum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(dated[0].endDatum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(dated[1].endDatum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	test('removing the last pre-AI file clears the active schedule completely', async () => {
		const scheduler = WizardMediator.createDefault({
			persistence: createPersistenceMock(),
			userId: null
		});
		const file = new File([DUMMY_TEXT], 'remove-me.txt', {
			type: 'text/plain'
		});

		scheduler.createSchedule([[file]]);

		const [process] = scheduler.schedule!;
		process.remove();

		expect(scheduler.schedule).toBeNull();
		expect(scheduler.numberOfFiles).toBe(0);
	});

	test('removing a batch-pending file unregisters it before flush', async () => {
		const scheduler = WizardMediator.createDefault({
			persistence: createPersistenceMock(),
			userId: null
		});
		const file = new File([DUMMY_TEXT], 'pending.txt', { type: 'text/plain' });

		scheduler.createSchedule([[file]]);

		const [process] = scheduler.schedule!;
		expect(process.machine.current).toBe(WizardStep.WAITING);

		process.context.dateRanges = createDateRanges();
		process.machine.send('next');
		await flush();

		expect(process.machine.current).toBe(WizardStep.BATCH_PENDING);
		expect(scheduler.batcher.size).toBe(1);

		process.remove();

		expect(scheduler.batcher.size).toBe(0);
		expect(scheduler.schedule).toBeNull();
	});

	test('file removed during PROCESSING ignores late async file routing result', async () => {
		const uploadResult =
			deferred<
				ReturnType<typeof okResult<{ fileUri: string; signedUrl: string }>>
			>();
		mockUploadToGcs.mockReturnValueOnce(uploadResult.promise);

		const scheduler = WizardMediator.createDefault({
			persistence: createPersistenceMock(),
			userId: null
		});
		const file = new File(['pdf-bytes'], 'delayed.pdf', {
			type: 'application/pdf'
		});

		scheduler.createSchedule([[file]]);

		const [process] = scheduler.schedule!;
		process.context.dateRanges = createDateRanges();
		process.machine.send('next');
		await flush();
		expect(process.machine.current).toBe(WizardStep.PROCESSING);
		process.remove();

		uploadResult.resolve(
			okResult({
				fileUri: 'gs://bucket/delayed.pdf',
				signedUrl: 'https://signed.example/delayed.pdf'
			})
		);
		await flush();
		await flush();

		expect(scheduler.schedule).toBeNull();
	});

	test('removed file is not included in AI completion flush input', async () => {
		mockSendBatch.mockResolvedValue({
			insufficient_tokens: false,
			results: [[AI_RESULT]]
		});

		const scheduler = WizardMediator.createDefault({
			persistence: createPersistenceMock(),
			userId: null
		});
		const first = new File([DUMMY_TEXT], 'first.txt', { type: 'text/plain' });
		const second = new File([DUMMY_TEXT], 'second.txt', { type: 'text/plain' });

		scheduler.createSchedule([[first, second]]);

		for (const process of scheduler.schedule!) {
			process.context.dateRanges = createDateRanges();
			process.machine.send('next');
		}
		await flush();
		await flush();

		scheduler.schedule![1].remove();
		await scheduler.flushAiCompletion();

		expect(mockSendBatch).toHaveBeenCalledTimes(1);
		expect(mockSendBatch.mock.calls[0][0].items).toHaveLength(1);
	});

	test('binary files are uploaded during PROCESSING before AI completion starts', async () => {
		mockUploadToGcs.mockResolvedValueOnce(
			okResult({
				fileUri: 'gs://bucket/late.pdf',
				signedUrl: 'https://signed.example/late.pdf'
			})
		);
		mockSendBatch.mockResolvedValueOnce({
			insufficient_tokens: false,
			results: [[AI_RESULT]]
		});

		const scheduler = WizardMediator.createDefault({
			persistence: createPersistenceMock(),
			userId: null
		});
		const file = new File(['pdf-bytes'], 'late.pdf', {
			type: 'application/pdf'
		});

		scheduler.createSchedule([[file]]);

		const [process] = scheduler.schedule!;
		process.context.dateRanges = createDateRanges();
		process.machine.send('next');
		await flush();
		await flush();

		expect(process.machine.current).toBe(WizardStep.BATCH_PENDING);
		expect(mockUploadToGcs).toHaveBeenCalledOnce();

		await scheduler.flushAiCompletion();

		expect(process.machine.current).toBe(WizardStep.DONE);
	});
});

import type { Entry, ResultEntry, WizardDirectoryEntry } from '$wizard/types';

import { invalidate } from '$app/navigation';
import berichtgenStore from '$core/stores/berichtgen.svelte';
import { GCS_MAX_BYTES, INLINE_MAX_BYTES } from '$lib/constants';
import { errResult, okResult, tryResultAsync } from '$lib/result';
import { FileTypes, WizardStep } from '$wizard/enums';
import { EFileRoutingError, WizardError } from '$wizard/errors';
import { spreadEntriesAcrossWeeks } from '$wizard/postprocess/time_spread';
import { fullResultSchema } from '$wizard/schemas';
import { uploadToGcs } from '$wizard/services/gcs_service';
import { FiniteStateMachine } from 'runed';

import type { WizardFileContext } from './wizard_file_context';
import type { WizardMediator } from './wizard_mediator.svelte';

export type StateMachineSignature = ReturnType<
	typeof createStateMachineForContext
>;

type WizardMachineEvent = 'cancel' | 'error' | 'init' | 'next' | 'start';

export function createStateMachineForContext({
	context,
	id,
	initialStep = WizardStep.INITIALISING,
	scheduler
}: {
	context: WizardFileContext;
	id: string;
	initialStep?: WizardStep;
	scheduler: WizardMediator;
}) {
	const machine = new FiniteStateMachine<WizardStep, WizardMachineEvent>(
		initialStep,
		{
			[WizardStep.AI_COMPLETION]: {
				cancel: () => {
					scheduler.persistSoon();
					return WizardStep.CANCELLED;
				},
				error: () => {
					scheduler.persistSoon();
					return WizardStep.ERROR;
				},
				next(...args: unknown[]) {
					const entries = args[0] as Entry[];
					context.snapshot = entries;
					invalidate('user:tokenCount');
					scheduler.persistSoon();
					return WizardStep.TIME_SPREADING;
				}
			},

			[WizardStep.BATCH_PENDING]: {
				_enter() {
					scheduler.onFileBatchPending(id);
				},
				cancel: () => {
					scheduler.persistSoon();
					return WizardStep.CANCELLED;
				},
				error: () => {
					scheduler.persistSoon();
					return WizardStep.ERROR;
				},
				start: () => {
					scheduler.persistSoon();
					return WizardStep.AI_COMPLETION;
				}
			},

			[WizardStep.CANCELLED]: {
				_enter() {
					scheduler.persistSoon();
					scheduler.onFileCancelled();
				},
				init: () => WizardStep.INITIALISING,
				next() {
					return WizardStep.INITIALISING;
				}
			},

			[WizardStep.DONE]: {
				_enter: () => {
					context.finished = context.snapshot as ResultEntry[];
					scheduler.persistSoon();
					if (scheduler.isDone) scheduler.finish();
				}
			},

			[WizardStep.ERROR]: {
				_enter() {
					scheduler.persistSoon();
					scheduler.onFileErrored();
				}
			},

			[WizardStep.INITIALISING]: {
				next: WizardStep.PROCESSING
			},

			[WizardStep.PROCESSING]: {
				_enter() {
					if ('url' in context.entry) {
						context.snapshot = { type: 'url' as const, url: context.entry.url };
						scheduler.persistSoon();
						machine.send('next');
						return;
					}

					processFile({ entry: context.entry }).then((result) => {
						if (!result.ok) {
							context.error = result.error;
							scheduler.persistSoon();
							machine.send('error');
						} else {
							context.snapshot = result.data;
							scheduler.persistSoon();
							machine.send('next');
						}
					});
				},
				cancel: () => {
					scheduler.persistSoon();
					return WizardStep.CANCELLED;
				},
				error: () => {
					scheduler.persistSoon();
					return WizardStep.ERROR;
				},
				next: () => {
					scheduler.persistSoon();
					return WizardStep.WAITING;
				}
			},

			[WizardStep.TIME_SPREADING]: {
				_enter() {
					context.snapshot = spreadEntriesAcrossWeeks(
						context.snapshot as Entry[],
						context.dateRanges!
					);
					scheduler.persistSoon();
					machine.send('next');
				},
				next: () => {
					scheduler.persistSoon();
					return WizardStep.DONE;
				}
			},

			[WizardStep.WAITING]: {
				_enter() {
					if (shouldSkipAiCompletion(context) || context.dateRanges !== null) {
						machine.send('next');
					}
				},
				cancel: () => {
					scheduler.persistSoon();
					return WizardStep.CANCELLED;
				},
				next() {
					if (shouldSkipAiCompletion(context)) {
						return context.dateRanges === null
							? WizardStep.DONE
							: WizardStep.TIME_SPREADING;
					}
					scheduler.persistSoon();
					return WizardStep.BATCH_PENDING;
				}
			}
		}
	);

	return machine;
}

async function processFile({ entry }: { entry: WizardDirectoryEntry }) {
	if (
		entry.type === 'file' &&
		entry.file.type === FileTypes.JSON &&
		!berichtgenStore.get('rewordJSON')
	) {
		return tryResultAsync(
			entry.file.text().then((text) => {
				const parsed = JSON.parse(text);
				const validated = fullResultSchema.safeParse(parsed);
				if (!validated.success) {
					throw new WizardError(EFileRoutingError.FORMAT_NOT_SUPPORTED);
				}
				return validated.data as ResultEntry[];
			}),
			WizardError,
			EFileRoutingError.FORMAT_NOT_SUPPORTED
		);
	}

	if (entry.type === 'url')
		return okResult({ type: 'url' as const, url: entry.url });

	if (entry.file.size > GCS_MAX_BYTES) {
		return errResult(WizardError, EFileRoutingError.FILE_TOO_LARGE);
	}

	if (entry.file.size <= INLINE_MAX_BYTES) {
		const text = await tryResultAsync(
			entry.file.text(),
			WizardError,
			EFileRoutingError.FILE_READ_FAILED
		);
		if (!text.ok) return text;

		return okResult({
			data: text.data,
			mimeType: entry.file.type,
			type: 'inline' as const
		});
	}

	const urls = await uploadToGcs(entry.file);

	if (urls.ok) {
		return okResult({
			...urls.data,
			mimeType: entry.file.type,
			type: 'gcs' as const
		});
	}

	return null as never;
}

function shouldSkipAiCompletion(context: WizardFileContext): boolean {
	return (
		'file' in context.entry &&
		context.entry.file.type === FileTypes.JSON &&
		!berichtgenStore.get('rewordJSON')
	);
}

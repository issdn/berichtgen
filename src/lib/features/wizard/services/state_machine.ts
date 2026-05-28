import type { Entry, ResultEntry, WizardDirectoryEntry } from '$wizard/types';

import { invalidate } from '$app/navigation';
import berichtgenStore from '$core/stores/berichtgen.svelte';
import { GCS_MAX_BYTES, INLINE_MAX_BYTES } from '$lib/constants';
import { BerichtgenError } from '$lib/errors';
import { errResult, okResult, tryResultAsync } from '$lib/result';
import { FileTypes, WizardStep } from '$wizard/enums';
import { EFileRoutingError } from '$wizard/errors';
import { spreadEntriesAcrossWeeks } from '$wizard/postprocess/time_spread';
import { fullResultSchema } from '$wizard/schemas';
import { uploadToGcs } from '$wizard/services/gcs_service';
import {
	GcsRouting,
	InlineRouting,
	UrlRouting
} from '$wizard/services/routing';
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
					return WizardStep.CANCELLED;
				},
				error: () => {
					return WizardStep.ERROR;
				},
				next(...args: unknown[]) {
					const entries = args[0] as Entry[];
					context.snapshot = entries;
					invalidate('user:tokenCount');
					return WizardStep.TIME_SPREADING;
				}
			},

			[WizardStep.BATCH_PENDING]: {
				_enter() {
					scheduler.onFileBatchPending(id);
				},
				cancel: () => {
					return WizardStep.CANCELLED;
				},
				error: () => {
					return WizardStep.ERROR;
				},
				start: () => {
					return WizardStep.AI_COMPLETION;
				}
			},

			[WizardStep.CANCELLED]: {
				_enter(meta) {
					context.lastState = meta.from;
					scheduler.onFileCancelled({ id });
				},
				next() {
					return context.lastState ?? WizardStep.INITIALISING;
				}
			},

			[WizardStep.DONE]: {
				_enter: () => {
					if (scheduler.isDone) scheduler.finish();
				}
			},

			[WizardStep.ERROR]: {},

			[WizardStep.INITIALISING]: {
				cancel: () => {
					return WizardStep.CANCELLED;
				},
				next: WizardStep.PROCESSING
			},
			[WizardStep.PROCESSING]: {
				_enter() {
					if ('url' in context.entry) {
						context.snapshot = new UrlRouting({ url: context.entry.url });
						machine.send('next');
						return;
					}

					processFile({ entry: context.entry }).then((result) => {
						if (!result.ok) {
							context.error = result.error;
							machine.send('error');
						} else {
							context.snapshot = result.data;
							machine.send('next');
						}
					});
				},
				cancel: () => {
					return WizardStep.CANCELLED;
				},
				error: () => {
					return WizardStep.ERROR;
				},
				next: () => {
					return WizardStep.WAITING;
				}
			},

			[WizardStep.TIME_SPREADING]: {
				_enter() {
					context.snapshot = spreadEntriesAcrossWeeks(
						context.snapshot as Entry[],
						context.dateRanges!
					);
					machine.send('next');
				},
				cancel: () => {
					return WizardStep.CANCELLED;
				},
				next: () => {
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
					return WizardStep.CANCELLED;
				},
				next() {
					if (shouldSkipAiCompletion(context)) {
						return context.dateRanges === null
							? WizardStep.DONE
							: WizardStep.TIME_SPREADING;
					}
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
		return tryResultAsync({
			apiError: EFileRoutingError.FORMAT_NOT_SUPPORTED,
			promise: entry.file.text().then((text) => {
				const parsed = JSON.parse(text);
				const validated = fullResultSchema.safeParse(parsed);
				if (!validated.success) {
					throw new BerichtgenError(EFileRoutingError.FORMAT_NOT_SUPPORTED);
				}
				return validated.data as ResultEntry[];
			})
		});
	}

	if (entry.type === 'url') return okResult(new UrlRouting({ url: entry.url }));

	if (entry.file.size > GCS_MAX_BYTES) {
		return errResult(EFileRoutingError.FILE_TOO_LARGE);
	}

	if (entry.file.type === FileTypes.TXT) {
		if (entry.file.size > INLINE_MAX_BYTES) {
			return errResult(EFileRoutingError.INLINE_TXT_TOO_LARGE);
		}
		const text = await tryResultAsync({
			apiError: EFileRoutingError.FILE_READ_FAILED,
			promise: entry.file.text()
		});
		if (!text.ok) return text;

		return okResult(
			new InlineRouting({ data: text.data, mimeType: entry.file.type })
		);
	}

	const urls = await uploadToGcs(entry.file);

	if (urls.ok) {
		return okResult(
			new GcsRouting({
				fileUri: urls.data.fileUri,
				mimeType: entry.file.type,
				signedUrl: urls.data.signedUrl
			})
		);
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

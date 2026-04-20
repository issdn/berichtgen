import fsm from 'svelte-fsm';
import type { WizardFileContext } from './wizard_file_context';
import { invalidate } from '$app/navigation';
import type { WizardScheduler } from './wizard_scheduler.svelte';
import type {
	Entry,
	ResultEntry,
	WizardProcessStateMachine
} from '$wizard/types';
import { WizardStep, FileTypes } from '$wizard/enums';
import berichtgenStore from '$lib/stores/berichtgen.svelte';
import { spreadEntriesAcrossWeeks } from '$wizard/postprocess/time_spread';
import { resolveFileRouting } from './file_routing';

function shouldSkipAiCompletion(context: WizardFileContext): boolean {
	return (
		typeof context.file !== 'string' &&
		context.file.type === FileTypes.JSON &&
		!berichtgenStore.get('rewordJSON')
	);
}

export function createStateMachineForContext(
	context: WizardFileContext,
	scheduler: WizardScheduler,
	id: string
) {
	return fsm(WizardStep.INITIALISING, {
		[WizardStep.INITIALISING]: {
			next: WizardStep.PROCESSING
		},

		[WizardStep.PROCESSING]: {
			_enter() {
				const file = context.file;
				if (typeof file === 'string') {
					context.snapshot = { type: 'url' as const, url: file };
					return void this.next();
				}

				resolveFileRouting(file, context, scheduler.scheduler!, {
					processPhotos: berichtgenStore.get('processPhotos'),
					rewordJSON: berichtgenStore.get('rewordJSON')
				}).then((result) => {
					if (result.ok) {
						context.snapshot = result.data;
						return void this.next();
					} else {
						context.error = result.error;
						return void this.error();
					}
				});
			},
			/** Parsed successfully — move to WAITING for user date-range input. */
			next: () => WizardStep.WAITING,
			error: () => WizardStep.ERROR,
			cancel: () => WizardStep.CANCELLED
		},

		[WizardStep.WAITING]: {
			_enter() {
				if (shouldSkipAiCompletion(context) || context.dateRanges !== null) {
					return void this.next();
				}
			},
			next() {
				if (shouldSkipAiCompletion(context)) {
					return context.dateRanges === null
						? WizardStep.DONE
						: WizardStep.TIME_SPREADING;
				}
				return WizardStep.BATCH_PENDING;
			},
			cancel: () => WizardStep.CANCELLED
		},

		/**
		 * The file has been parsed and configured.
		 * It waits here (without a spinner) until the scheduler has collected all
		 * pending files and is ready to fire the batch request.
		 * Transitions are driven externally by WizardScheduler.
		 */
		[WizardStep.BATCH_PENDING]: {
			_enter() {
				scheduler.onFileBatchPending(id);
			},
			/** Called by the scheduler just before it sends this file's batch to the API. */
			start: () => WizardStep.AI_COMPLETION,
			/** Called by the scheduler if the file must be errored before the batch starts. */
			error: () => WizardStep.ERROR,
			cancel: () => WizardStep.CANCELLED
		},

		/**
		 * The batch request is in-flight. The spinner is shown in this state.
		 * Transitions are driven externally by WizardScheduler.runBatches().
		 */
		[WizardStep.AI_COMPLETION]: {
			/**
			 * Called by the scheduler on success with the AI-returned entries.
			 * Moves the file to TIME_SPREADING to distribute entries across weeks.
			 */
			next(entries: Entry[]) {
				context.snapshot = entries;
				invalidate('user:tokenCount');
				return WizardStep.TIME_SPREADING;
			},
			/** Called by the scheduler when the batch failed (API error, token shortage, etc.). */
			error: () => WizardStep.ERROR,
			cancel: () => WizardStep.CANCELLED
		},

		[WizardStep.TIME_SPREADING]: {
			_enter() {
				context.snapshot = spreadEntriesAcrossWeeks(
					context.snapshot as Entry[],
					context.dateRanges!
				);
				return void this.next();
			},
			next: () => WizardStep.DONE
		},

		[WizardStep.DONE]: {
			_enter: () => {
				context.finished = context.snapshot as ResultEntry[];
				scheduler.dequeue();
			}
		},

		[WizardStep.ERROR]: {
			_enter() {
				scheduler.onFileErrored();
			}
		},

		[WizardStep.CANCELLED]: {
			_enter() {
				scheduler.onFileCancelled();
			},
			next(process: WizardProcessStateMachine) {
				scheduler.filesUnfinished -= 1;
				scheduler.filesReady -= 1;
				this.init();
				scheduler.enqueue(process);
			},
			init: () => WizardStep.INITIALISING
		}
	});
}

export type StateMachineSignature = typeof createStateMachineForContext;



import fsm from 'svelte-fsm';
import type { WizardFileContext } from './wizard_file_context.svelte';
import { invalidate } from '$app/navigation';
import type { WizardScheduler } from './wizard_scheduler.svelte';
import type {
	Entry,
	ResultEntry,
	WizardProcessStateMachine
} from '$wizard/types';
import { WizardStep } from '$wizard/enums';
import { berichtgenStore } from '$lib/stores/berichtgen.svelte';
import { spreadEntriesAcrossWeeks } from '$wizard/postprocess/time_spread';
import { resolveFileRouting } from './file_routing';

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
				if (context.cancelled) {
					this.cancel();
					return;
				}

				resolveFileRouting(context.file, context, scheduler.scheduler!, {
					processPhotos: berichtgenStore.processPhotos,
					rewordJSON: berichtgenStore.rewordJSON
				}).then((result) => {
					if (result.ok) {
						context.snapshot = result.data;
						this.next();
					} else {
						context.error = result.error;
						this.error();
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
				if (context.cancelled) {
					this.cancel();
					return;
				}
				if (context.shouldSkip || context.dateRanges !== null) {
					this.next();
				}
			},
			next() {
				if (context.shouldSkip) {
					if (context.dateRanges === null) {
						return WizardStep.DONE;
					} else {
						return WizardStep.TIME_SPREADING;
					}
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
			error: () => WizardStep.ERROR
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
			error: () => WizardStep.ERROR
		},

		[WizardStep.TIME_SPREADING]: {
			_enter() {
				if (context.cancelled) {
					this.cancel();
					return;
				}
				context.snapshot = spreadEntriesAcrossWeeks(
					context.snapshot as Entry[],
					context.dateRanges!
				);
				this.next();
			},
			next: () => WizardStep.DONE,
			error: () => WizardStep.ERROR,
			cancel: () => WizardStep.CANCELLED
		},

		[WizardStep.DONE]: {
			_enter: () => {
				if (context.cancelled) {
					return WizardStep.CANCELLED;
				}
				context.finished = context.snapshot as ResultEntry[];
				scheduler.dequeue();
			}
		},

		[WizardStep.ERROR]: {
			_enter() {
				scheduler.filesUnfinished += 1;
				scheduler.dequeue();
			}
		},

		[WizardStep.CANCELLED]: {
			_enter() {
				scheduler.filesUnfinished += 1;
				scheduler.dequeue();
			},
			next(machine: WizardProcessStateMachine) {
				scheduler.filesUnfinished -= 1;
				scheduler.filesReady -= 1;
				this.init();
				scheduler.enqueue(machine);
			},
			init: () => WizardStep.INITIALISING
		}
	});
}

export type StateMachineSignature = typeof createStateMachineForContext;

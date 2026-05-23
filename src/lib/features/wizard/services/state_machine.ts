import fsm from 'svelte-fsm';
import type { WizardFileContext } from './wizard_file_context';
import { invalidate } from '$app/navigation';
import type { WizardMediator } from './wizard_mediator.svelte';
import type { Entry, ResultEntry } from '$wizard/types';
import { WizardStep, FileTypes } from '$wizard/enums';
import berichtgenStore from '$core/stores/berichtgen.svelte';
import { spreadEntriesAcrossWeeks } from '$wizard/postprocess/time_spread';
import { resolveFileRouting } from './file_routing';

function shouldSkipAiCompletion(context: WizardFileContext): boolean {
	return (
		'file' in context.file &&
		context.file.file.type === FileTypes.JSON &&
		!berichtgenStore.get('rewordJSON')
	);
}

export function createStateMachineForContext(
	context: WizardFileContext,
	scheduler: WizardMediator,
	id: string,
	initialStep: WizardStep = WizardStep.INITIALISING
) {
	return fsm(initialStep, {
		[WizardStep.INITIALISING]: {
			next: WizardStep.PROCESSING
		},

		[WizardStep.PROCESSING]: {
			_enter() {
				if ('url' in context.file) {
					context.snapshot = { type: 'url' as const, url: context.file.url };
					scheduler.persistSoon();
					return void this.next();
				}

				resolveFileRouting(
					context.file.file,
					berichtgenStore.get('rewordJSON')
				).then((result) => {
					if (result.ok) {
						context.snapshot = result.data;
						scheduler.persistSoon();
						return void this.next();
					} else {
						context.error = result.error;
						scheduler.persistSoon();
						return void this.error();
					}
				});
			},
			/** Parsed successfully — move to WAITING for user date-range input. */
			next: () => {
				scheduler.persistSoon();
				return WizardStep.WAITING;
			},
			error: () => {
				scheduler.persistSoon();
				return WizardStep.ERROR;
			},
			cancel: () => {
				scheduler.persistSoon();
				return WizardStep.CANCELLED;
			}
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
				scheduler.persistSoon();
				return WizardStep.BATCH_PENDING;
			},
			cancel: () => {
				scheduler.persistSoon();
				return WizardStep.CANCELLED;
			}
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
			start: () => {
				scheduler.persistSoon();
				return WizardStep.AI_COMPLETION;
			},
			/** Called by the scheduler if the file must be errored before the batch starts. */
			error: () => {
				scheduler.persistSoon();
				return WizardStep.ERROR;
			},
			cancel: () => {
				scheduler.persistSoon();
				return WizardStep.CANCELLED;
			}
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
				scheduler.persistSoon();
				return WizardStep.TIME_SPREADING;
			},
			/** Called by the scheduler when the batch failed (API error, token shortage, etc.). */
			error: () => {
				scheduler.persistSoon();
				return WizardStep.ERROR;
			},
			cancel: () => {
				scheduler.persistSoon();
				return WizardStep.CANCELLED;
			}
		},

		[WizardStep.TIME_SPREADING]: {
			_enter() {
				context.snapshot = spreadEntriesAcrossWeeks(
					context.snapshot as Entry[],
					context.dateRanges!
				);
				scheduler.persistSoon();
				return void this.next();
			},
			next: () => {
				scheduler.persistSoon();
				return WizardStep.DONE;
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

		[WizardStep.CANCELLED]: {
			_enter() {
				scheduler.persistSoon();
				scheduler.onFileCancelled();
			},
			next() {
				return WizardStep.INITIALISING;
			},
			init: () => WizardStep.INITIALISING
		}
	});
}

export type StateMachineSignature = typeof createStateMachineForContext;

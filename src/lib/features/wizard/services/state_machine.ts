import { FiniteStateMachine } from 'runed';
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

type WizardMachineEvent = 'next' | 'start' | 'error' | 'cancel' | 'init';

export function createStateMachineForContext(
	context: WizardFileContext,
	scheduler: WizardMediator,
	id: string,
	initialStep: WizardStep = WizardStep.INITIALISING
) {
	const machine = new FiniteStateMachine<WizardStep, WizardMachineEvent>(
		initialStep,
		{
			[WizardStep.INITIALISING]: {
				next: WizardStep.PROCESSING
			},

			[WizardStep.PROCESSING]: {
				_enter() {
					if ('url' in context.file) {
						context.snapshot = { type: 'url' as const, url: context.file.url };
						scheduler.persistSoon();
						machine.send('next');
						return;
					}

					resolveFileRouting(
						context.file.file,
						berichtgenStore.get('rewordJSON')
					).then((result) => {
						if (result.ok) {
							context.snapshot = result.data;
							scheduler.persistSoon();
							machine.send('next');
							return;
						}

						context.error = result.error;
						scheduler.persistSoon();
						machine.send('error');
					});
				},
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
						machine.send('next');
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

			[WizardStep.BATCH_PENDING]: {
				_enter() {
					scheduler.onFileBatchPending(id);
				},
				start: () => {
					scheduler.persistSoon();
					return WizardStep.AI_COMPLETION;
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

			[WizardStep.AI_COMPLETION]: {
				next(...args: unknown[]) {
					const entries = args[0] as Entry[];
					context.snapshot = entries;
					invalidate('user:tokenCount');
					scheduler.persistSoon();
					return WizardStep.TIME_SPREADING;
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
		}
	);

	return machine;
}

export type StateMachineSignature = ReturnType<
	typeof createStateMachineForContext
>;

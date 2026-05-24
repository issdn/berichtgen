import type { Entry, ResultEntry } from '$wizard/types';

import { invalidate } from '$app/navigation';
import berichtgenStore from '$core/stores/berichtgen.svelte';
import { FileTypes, WizardStep } from '$wizard/enums';
import { spreadEntriesAcrossWeeks } from '$wizard/postprocess/time_spread';
import { FiniteStateMachine } from 'runed';

import type { WizardFileContext } from './wizard_file_context';
import type { WizardMediator } from './wizard_mediator.svelte';

import { resolveFileRouting } from './file_routing';

export type StateMachineSignature = ReturnType<
	typeof createStateMachineForContext
>;

type WizardMachineEvent = 'cancel' | 'error' | 'init' | 'next' | 'start';

export function createStateMachineForContext(
	context: WizardFileContext,
	scheduler: WizardMediator,
	id: string,
	initialStep: WizardStep = WizardStep.INITIALISING
) {
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

function shouldSkipAiCompletion(context: WizardFileContext): boolean {
	return (
		'file' in context.file &&
		context.file.file.type === FileTypes.JSON &&
		!berichtgenStore.get('rewordJSON')
	);
}

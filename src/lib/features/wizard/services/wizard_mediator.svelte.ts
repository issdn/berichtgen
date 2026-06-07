import type { WizardPersistenceController } from '$core/persistence/wizard_persistence_controller.svelte';
import type { Ort } from '$wizard/enums';
import type { BatchCompletionItem } from '$wizard/schemas';
import type { FileRouting } from '$wizard/services/routing';
import type {
	BatchItem,
	BatchResult,
	GenaiCompletionResult,
	WizardDirectories,
	WizardPersistedSession,
	WizardProcessStateMachine
} from '$wizard/types';

import { BerichtgenError } from '$lib/errors';
import { type Result, tryResultAsync } from '$lib/result';
import { debounce } from '$lib/utils';
import { submitBatchCompletionCommand } from '$wizard/api/wizard.remote';
import { createBatchesByCount } from '$wizard/completion/batching';
import { WizardStep } from '$wizard/enums';
import { EWizardError } from '$wizard/errors';
import { Context } from 'runed';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';

import { createStateMachineForContext } from './state_machine';
import { WizardBatcher } from './wizard_batcher';
import { WizardFileContext } from './wizard_file_context';
import { WizardScheduler } from './wizard_scheduler.svelte';

export class WizardMediator {
	readonly batcher: WizardBatcher;

	persistedSessionPromise: Promise<null | WizardPersistedSession>;

	readonly persistence: WizardPersistenceController;

	persistSoon = debounce(() => {
		if (this.persistence.isRehydrating) return;
		void this.persistNow();
	}, 250);

	processInit = $state<null | Promise<void>>(null);

	readonly schedulerState: WizardScheduler;

	sessionId: string = crypto.randomUUID();

	userKey: string = 'anon';

	get filesStates() {
		return this.schedulerState.filesStates;
	}

	get isDone() {
		return (
			this.schedulerState.schedule !== null &&
			this.filesStates!.done + this.filesStates!.error ===
				this.schedulerState.numberOfFiles
		);
	}

	get numberOfFiles() {
		return this.schedulerState.numberOfFiles;
	}

	get schedule() {
		return this.schedulerState.schedule;
	}

	set schedule(value: null | WizardProcessStateMachine[]) {
		this.schedulerState.setSchedule(value);
	}

	constructor(
		schedulerState: WizardScheduler,
		batcher: WizardBatcher,
		persistence: WizardPersistenceController,
		userId?: null | string
	) {
		this.schedulerState = schedulerState;
		this.batcher = batcher;
		this.persistence = persistence;
		this.userKey = userId ? `user:${userId}` : 'anon';
		this.persistedSessionPromise = this.loadPersistedSession();
	}

	static createDefault({
		persistence,
		userId
	}: {
		persistence: WizardPersistenceController;
		userId: null | undefined;
	}) {
		return new WizardMediator(
			new WizardScheduler(),
			new WizardBatcher(),
			persistence,
			userId
		);
	}

	async clearPersistedSession() {
		await this.persistence.clearWizardSession({ key: this.userKey });
	}

	createProcessStateMachine = (
		context: WizardFileContext,
		id: string = crypto.randomUUID(),
		initialStep: WizardStep = WizardStep.INITIALISING
	) => {
		const machine = createStateMachineForContext({
			context,
			id,
			initialStep,
			scheduler: this
		});

		const process: WizardProcessStateMachine = {
			cancel() {
				machine.send('cancel');
			},
			confirmDateRanges() {
				if ((context.dateRanges?.ranges?.length ?? 0) > 0) {
					machine.send('next');
				}
			},
			context,
			id,
			machine,
			remove: () => {
				this.removeProcess({ id });
			},
			restart() {
				machine.send('next');
			}
		};
		return process;
	};

	createSchedule = (directories: WizardDirectories) => {
		this.schedulerState.createSchedule(directories, (entry) =>
			this.createProcessStateMachine(new WizardFileContext(entry))
		);
		for (const process of this.schedulerState.schedule ?? []) {
			process.machine.send('next');
		}
		this.persistSoon();
	};

	exportSnapshot(): WizardPersistedSession {
		return {
			files: this.schedulerState.toPersistedFiles(),
			sessionId: this.sessionId,
			updatedAt: Date.now()
		};
	}

	async flushAiCompletion(): Promise<void> {
		if (this.schedulerState.schedule === null) return;

		this.persistSoon();

		const pendingList = this.takePendingProcesses();
		if (pendingList.length === 0) return;

		const pendingItems = pendingList.map((process, fileIndex) => {
			const routing = process.context.snapshot as FileRouting;
			const ort = process.context.dateRanges!.ort;
			return {
				fileIndex,
				ort,
				routing
			};
		});

		const batches = createBatchesByCount({ items: pendingItems });

		const fileResults = new SvelteMap<number, GenaiCompletionResult>();
		const fileErrors = new SvelteMap<number, BerichtgenError['apiError']>();
		const startedFileIndices = new SvelteSet<number>();
		const globalError = await this.processBatches(
			batches,
			pendingList,
			startedFileIndices,
			fileResults,
			fileErrors
		);

		this.applyResults(pendingList, fileResults, fileErrors, globalError);
	}

	/** Returns whether a process is still tracked in the active schedule. */
	hasProcess({ id }: { id: string }): boolean {
		return this.schedulerState.findById(id) !== undefined;
	}

	init = (session: null | WizardPersistedSession = null) => {
		this.resetRuntimeState();
		if (session) {
			this.rehydrateFromSnapshot(session);
			return;
		}
		this.sessionId = crypto.randomUUID();
	};

	async loadPersistedSession(): Promise<null | WizardPersistedSession> {
		return this.persistence.loadWizardSession({ key: this.userKey });
	}

	onFileBatchPending = (id: string) => {
		const file = this.schedulerState.findById(id);
		if (!file) return;
		this.batcher.register(file);
		this.persistSoon();
	};

	onFileCancelled = ({ id }: { id: string }) => {
		this.batcher.unregister({ id });
		this.persistSoon();
	};

	async persistNow() {
		await this.persistence.saveWizardSession({
			key: this.userKey,
			payload: this.exportSnapshot()
		});
	}

	/** Removes a process from the active schedule and updates batching/persistence state. */
	removeProcess({ id }: { id: string }): void {
		const removed = this.schedulerState.removeById({ id });
		if (!removed) return;

		this.batcher.unregister({ id });

		if (this.schedulerState.schedule === null) {
			this.processInit = null;
			void this.clearPersistedSession();
			return;
		}

		this.persistSoon();
	}

	private applyResults(
		pendingList: WizardProcessStateMachine[],
		fileResults: Map<number, GenaiCompletionResult>,
		fileErrors: Map<number, BerichtgenError['apiError']>,
		globalError: BerichtgenError | null
	) {
		for (let fileIndex = 0; fileIndex < pendingList.length; fileIndex++) {
			const process = pendingList[fileIndex];
			if (!this.hasProcess({ id: process.id })) continue;

			if (globalError !== null) {
				process.context.error = globalError;
				process.machine.send('error');
				continue;
			}
			const fileError = fileErrors.get(fileIndex);
			if (fileError) {
				process.context.error = new BerichtgenError(fileError);
				process.machine.send('error');
				continue;
			}

			const entries = fileResults.get(fileIndex) ?? null;
			if (entries === null) {
				process.context.error = new BerichtgenError(
					EWizardError.COMPLETION_FAILED
				);
				process.machine.send('error');
			} else {
				process.context.snapshot = entries;
				process.machine.send('next', entries);
			}
		}

		this.persistSoon();
	}

	private collectBatchResults({
		batch,
		batchResults,
		fileErrors,
		fileResults
	}: {
		batch: BatchItem[];
		batchResults: BatchResult[];
		fileErrors: SvelteMap<number, BerichtgenError['apiError']>;
		fileResults: SvelteMap<number, GenaiCompletionResult>;
	}): BerichtgenError['apiError'] | null {
		let globalError: BerichtgenError['apiError'] | null = null;
		for (let i = 0; i < batch.length; i++) {
			const { fileIndex } = batch[i];
			const result = batchResults[i];
			if (!result) continue;
			if (result.ok) {
				fileResults.set(fileIndex, result.data);
				continue;
			}
			fileErrors.set(fileIndex, result.error);
			globalError = globalError ?? (result.error.global ? result.error : null);
		}
		return globalError;
	}

	private markRemainingFilesWithGlobalError(
		pendingList: WizardProcessStateMachine[],
		startedFileIndices: SvelteSet<number>,
		fileErrors: SvelteMap<number, BerichtgenError['apiError']>,
		globalError: BerichtgenError['apiError']
	) {
		for (let fileIndex = 0; fileIndex < pendingList.length; fileIndex++) {
			if (startedFileIndices.has(fileIndex)) continue;
			fileErrors.set(fileIndex, globalError);
		}
	}

	private async processBatches(
		batches: BatchItem[][],
		pendingList: WizardProcessStateMachine[],
		startedFileIndices: SvelteSet<number>,
		fileResults: SvelteMap<number, GenaiCompletionResult>,
		fileErrors: SvelteMap<number, BerichtgenError['apiError']>
	): Promise<BerichtgenError | null> {
		for (const batch of batches) {
			this.startBatchFiles(batch, pendingList, startedFileIndices);

			const result = await sendBatchCompletion(batch);

			if (!result.ok) {
				return result.error;
			}

			const globalBatchError = this.collectBatchResults({
				batch,
				batchResults: result.data,
				fileErrors,
				fileResults
			});
			if (globalBatchError) {
				this.markRemainingFilesWithGlobalError(
					pendingList,
					startedFileIndices,
					fileErrors,
					globalBatchError
				);
				return null;
			}
		}

		return null;
	}

	private rehydrateFromSnapshot(snapshot: WizardPersistedSession): void {
		this.persistence.isRehydrating = true;
		this.sessionId = snapshot.sessionId;
		this.resetRuntimeState();

		const restored: WizardProcessStateMachine[] = [];
		for (const file of snapshot.files) {
			const restoredStep =
				file.step === WizardStep.AI_COMPLETION
					? WizardStep.BATCH_PENDING
					: file.step;
			const context = WizardFileContext.rehydrate(file);
			const process = this.createProcessStateMachine(
				context,
				file.id,
				restoredStep
			);
			restored.push(process);
		}

		this.schedulerState.setSchedule(restored);

		for (const process of restored) {
			if (process.machine.current === WizardStep.BATCH_PENDING) {
				this.batcher.register(process);
			}
		}
		this.persistence.isRehydrating = false;
	}

	private resetRuntimeState() {
		this.batcher.reset();
		this.schedulerState.clear();
	}

	private startBatchFiles(
		batch: BatchItem[],
		pendingList: WizardProcessStateMachine[],
		startedFileIndices: SvelteSet<number>
	) {
		for (const { fileIndex } of batch) {
			if (startedFileIndices.has(fileIndex)) continue;
			pendingList[fileIndex].machine.send('start');
			startedFileIndices.add(fileIndex);
		}
	}

	private takePendingProcesses() {
		const pendingIds = this.batcher.takePendingIds();
		return pendingIds.map((id) => this.schedulerState.findById(id)!);
	}
}

/**
 * Sends a single batch of completion items to the server endpoint.
 * Returns the raw batch response with one structured result entry per item.
 *
 * Each item carries a `FileRouting` descriptor that determines how it is sent:
 * - `inline` -> `{ type: 'inline', data, mimeType, ort }`
 * - `gcs`    -> `{ type: 'gcs', fileUri, mimeType, ort }`
 * - `url`    -> `{ type: 'url', url, ort }`
 */
function sendBatchCompletion(
	items: Array<{ ort: Ort; routing: FileRouting }>
): Promise<Result<BatchResult[]>> {
	const mapped: BatchCompletionItem[] = items.map(({ ort, routing }) =>
		routing.toBatchCompletionItem({ ort })
	);

	return tryResultAsync({
		apiError: EWizardError.INVALID_JSON_FROM_AI,
		promise: submitBatchCompletionCommand({ items: mapped })
	});
}

export const wizardMediatorContext = new Context<WizardMediator>(
	'wizard_mediator'
);

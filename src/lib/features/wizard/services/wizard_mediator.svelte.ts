import type { WizardPersistenceController } from '$core/persistence/wizard_persistence_controller.svelte';
import type {
	BatchErrorScope,
	BatchItem,
	GenaiCompletionResult,
	WizardDirectories,
	WizardPersistedSession,
	WizardProcessStateMachine
} from '$wizard/types';

import { BerichtgenError } from '$lib/errors';
import { debounce } from '$lib/utils';
import {
	createBatchesBySize,
	MAX_BATCH_BYTES,
	sendBatchCompletion
} from '$wizard/completion/completion';
import { WizardStep } from '$wizard/enums';
import { ECompletionException, EWizardError } from '$wizard/errors';
import { type FileRouting } from '$wizard/services/routing';
import { Context } from 'runed';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';

import { createStateMachineForContext } from './state_machine';
import { WizardBatcher } from './wizard_batcher';
import { WizardFileContext } from './wizard_file_context';
import { WizardScheduler } from './wizard_scheduler.svelte';

const MAX_PARALLEL_REQUESTS = 5;

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

	finish = () => {
		void this.clearPersistedSession();
	};

	async flushAiCompletion(): Promise<void> {
		if (this.schedulerState.schedule === null) return;

		for (const process of this.schedulerState.schedule) {
			const step = process.machine.current as WizardStep;
			if (step === WizardStep.INITIALISING || step === WizardStep.PROCESSING) {
				return;
			}
			if (step === WizardStep.WAITING) return;
		}

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

		const batches = createBatchesBySize(pendingItems, MAX_BATCH_BYTES);

		const fileResults = new SvelteMap<number, GenaiCompletionResult>();
		const fileErrors = new SvelteMap<number, BerichtgenError>();
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
		if (this.isDone) this.finish();
	}

	private applyResults(
		pendingList: WizardProcessStateMachine[],
		fileResults: Map<number, GenaiCompletionResult>,
		fileErrors: Map<number, BerichtgenError>,
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
				process.context.error = fileError;
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
		if (this.isDone) this.finish();
	}

	private classifyBatchError(error: BerichtgenError): BatchErrorScope {
		return error.apiError.code === EWizardError.INVALID_JSON_FROM_AI.code
			? 'file_scoped'
			: 'global';
	}

	private collectBatchResults(
		batch: BatchItem[],
		results: GenaiCompletionResult[],
		fileResults: SvelteMap<number, GenaiCompletionResult>
	) {
		for (let i = 0; i < batch.length; i++) {
			const { fileIndex } = batch[i];
			const result = results[i];
			if (result != null) fileResults.set(fileIndex, result);
		}
	}

	private async processBatches(
		batches: BatchItem[][],
		pendingList: WizardProcessStateMachine[],
		startedFileIndices: SvelteSet<number>,
		fileResults: SvelteMap<number, GenaiCompletionResult>,
		fileErrors: SvelteMap<number, BerichtgenError>
	): Promise<BerichtgenError | null> {
		if (batches.length === 0) return null;

		let cursor = 0;
		let globalError: BerichtgenError | null = null;
		const workerCount = Math.min(MAX_PARALLEL_REQUESTS, batches.length);

		const worker = async () => {
			while (true) {
				if (globalError !== null) return;
				const index = cursor;
				cursor++;
				const batch = batches[index];
				if (!batch) return;

				this.startBatchFiles(batch, pendingList, startedFileIndices);
				const result = await sendBatchCompletion(batch);

				if (!result.ok) {
					const scope = this.classifyBatchError(result.error);
					if (scope === 'global') {
						globalError = result.error;
						return;
					}
					for (const { fileIndex } of batch) {
						fileErrors.set(fileIndex, result.error);
					}
					continue;
				}

				this.collectBatchResults(batch, result.data.results, fileResults);

				if (result.data.insufficient_tokens) {
					globalError = new BerichtgenError(
						ECompletionException.NOT_ENOUGH_TOKENS
					);
					return;
				}
			}
		};

		await Promise.all(Array.from({ length: workerCount }, () => worker()));
		return globalError;
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
		if (this.isDone) this.finish();
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

export const wizardMediatorContext = new Context<WizardMediator>(
	'wizard_mediator'
);

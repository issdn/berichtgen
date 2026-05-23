import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import berichtgenStore from '$core/stores/berichtgen.svelte';
import { createStateMachineForContext } from './state_machine';
import { BerichtgenError } from '$lib/errors';
import {
	WizardError,
	EWizardError,
	ECompletionException
} from '$wizard/errors';
import { WizardFileContext } from './wizard_file_context';
import type {
	ResultEntry,
	WizardDirectories,
	WizardProcessStateMachine
} from '$wizard/types';
import { combineJSONs } from '$wizard/postprocess/combine';
import { Ort, WizardStep } from '$wizard/enums';
import {
	createBatchesBySize,
	MAX_BATCH_BYTES,
	sendBatchCompletion
} from '$wizard/completion/completion';
import type { BatchErrorScope, WizardPersistedSession } from './types';
import {
	WIZARD_PERSISTENCE_STORE,
	WIZARD_PERSISTENCE_TTL_MS,
	WIZARD_PERSISTENCE_VERSION
} from '$lib/constants';
import Persistence from '$core/persistence';
import { debounce } from '$lib/utils';
import { WizardScheduler } from './wizard_scheduler.svelte';
import { WizardBatcher } from './wizard_batcher';
import type { FileRouting } from './file_routing';
import { Context } from 'runed';

const MAX_PARALLEL_REQUESTS = 5;

type BatchItem = {
	routing: FileRouting;
	ort: Ort;
	fileIndex: number;
	text: string;
};

export class WizardMediator {
	readonly schedulerState: WizardScheduler;

	readonly batcher: WizardBatcher;

	constructor(
		schedulerState: WizardScheduler,
		batcher: WizardBatcher,
		userId?: string | null
	) {
		this.schedulerState = schedulerState;
		this.batcher = batcher;
		this.userKey = userId ? `user:${userId}` : 'anon';
		this.persistedSessionPromise = this.loadPersistedSession();
	}

	static createDefault(userId?: string | null) {
		return new WizardMediator(
			new WizardScheduler(),
			new WizardBatcher(),
			userId
		);
	}

	result = $state<Promise<ResultEntry[]> | null>(null);

	processInit = $state<Promise<void> | null>(null);

	flushRequested = $state(false);

	isRunning = $derived.by(() => this.batcher.isRunning);

	userKey: string = 'anon';

	persistedSessionPromise: Promise<WizardPersistedSession | null>;

	sessionId: string = crypto.randomUUID();

	get isDone() {
		return (
			this.schedulerState.schedule !== null &&
			this.filesStates?.done === this.schedulerState.numberOfFiles
		);
	}

	get schedule() {
		return this.schedulerState.schedule;
	}

	set schedule(value: WizardProcessStateMachine[] | null) {
		this.schedulerState.setSchedule(value);
	}

	get numberOfFiles() {
		return this.schedulerState.numberOfFiles;
	}

	get filesStates() {
		return this.schedulerState.filesStates;
	}

	persistSoon = debounce(() => {
		void this.persistNow();
	}, 250);

	async persistNow() {
		await Persistence.save(
			WIZARD_PERSISTENCE_STORE,
			this.userKey,
			this.exportSnapshot(),
			WIZARD_PERSISTENCE_VERSION
		);
	}

	async clearPersistedSession() {
		await Persistence.clear(WIZARD_PERSISTENCE_STORE, this.userKey);
	}

	async loadPersistedSession(): Promise<WizardPersistedSession | null> {
		return Persistence.load<WizardPersistedSession>(
			WIZARD_PERSISTENCE_STORE,
			this.userKey,
			WIZARD_PERSISTENCE_VERSION,
			WIZARD_PERSISTENCE_TTL_MS
		);
	}

	private resetRuntimeState() {
		this.batcher.reset();
		this.schedulerState.clear();
		this.result = null;
		this.flushRequested = false;
	}

	onFileErrored = () => {
		this.persistSoon();
	};

	onFileCancelled = () => {
		this.persistSoon();
	};

	init = async (session: WizardPersistedSession | null = null) => {
		this.resetRuntimeState();
		if (session) {
			this.rehydrateFromSnapshot(session);
			return;
		}
		this.sessionId = crypto.randomUUID();
		this.persistSoon();
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

	finish = () => {
		this.result = (async () => {
			const finishedDirectories = this.schedulerState.getFinishedDirectories();
			const combined = combineJSONs(
				finishedDirectories,
				berichtgenStore.get('constantHours')
			);
			await this.clearPersistedSession();
			return combined;
		})();
	};

	onFileBatchPending = (id: string) => {
		const file = this.schedulerState.findById(id);
		if (!file) return;
		this.batcher.register(file);
		this.persistSoon();
	};

	private classifyBatchError(error: BerichtgenError): BatchErrorScope {
		return error.apiError.code === EWizardError.INVALID_JSON_FROM_AI.code
			? 'file_scoped'
			: 'global';
	}

	async flushAiCompletion(): Promise<void> {
		if (this.schedulerState.schedule === null) return;

		for (const process of this.schedulerState.schedule) {
			const step = process.machine.current as WizardStep;
			if (step === WizardStep.INITIALISING || step === WizardStep.PROCESSING) {
				return;
			}
			if (step === WizardStep.WAITING) return;
		}

		this.flushRequested = true;
		this.persistSoon();

		const pendingList = this.takePendingProcesses();
		if (pendingList.length === 0) return;

		const pendingItems = pendingList.map((process, fileIndex) => {
			const routing = process.context.snapshot as FileRouting;
			const ort = process.context.dateRanges!.ort;
			return {
				routing,
				ort,
				fileIndex,
				text: this.toSizeProxyText(routing)
			};
		});
		const batches = createBatchesBySize<BatchItem>(
			pendingItems,
			MAX_BATCH_BYTES
		);

		const fileResults = new SvelteMap<number, string[]>();
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

	private takePendingProcesses() {
		const pendingIds = this.batcher.takePendingIds();
		return pendingIds.map((id) => this.schedulerState.findById(id)!);
	}

	private async processBatches(
		batches: BatchItem[][],
		pendingList: WizardProcessStateMachine[],
		startedFileIndices: SvelteSet<number>,
		fileResults: SvelteMap<number, string[]>,
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
					globalError = new WizardError(ECompletionException.NOT_ENOUGH_TOKENS);
					return;
				}
			}
		};

		await Promise.all(Array.from({ length: workerCount }, () => worker()));
		return globalError;
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

	private collectBatchResults(
		batch: BatchItem[],
		results: (string[] | null)[],
		fileResults: SvelteMap<number, string[]>
	) {
		for (let i = 0; i < batch.length; i++) {
			const { fileIndex } = batch[i];
			const result = results[i];
			if (result != null) fileResults.set(fileIndex, result);
		}
	}

	private applyResults(
		pendingList: WizardProcessStateMachine[],
		fileResults: SvelteMap<number, string[]>,
		fileErrors: SvelteMap<number, BerichtgenError>,
		globalError: BerichtgenError | null
	) {
		for (let fileIndex = 0; fileIndex < pendingList.length; fileIndex++) {
			const process = pendingList[fileIndex];
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

			const result = fileResults.get(fileIndex);
			const entries = result ? result.map((text) => ({ text })) : null;
			if (entries === null) {
				process.context.error = new WizardError(EWizardError.COMPLETION_FAILED);
				process.machine.send('error');
			} else {
				process.context.snapshot = entries;
				process.machine.send('next', entries);
			}
		}

		this.flushRequested = false;
		this.persistSoon();
		if (this.isDone) this.finish();
	}

	private toSizeProxyText(routing: FileRouting): string {
		if (routing.type === 'inline') {
			return 'x'.repeat(Math.ceil((routing.data.length * 3) / 4));
		}
		if (routing.type === 'gcs') return routing.fileUri;
		return routing.url;
	}

	createProcessStateMachine = (
		context: WizardFileContext,
		id: string = crypto.randomUUID(),
		initialStep: WizardStep = WizardStep.INITIALISING
	) => {
		const machine = createStateMachineForContext(
			context,
			this,
			id,
			initialStep
		);

		const process: WizardProcessStateMachine = {
			context,
			machine,
			id,
			cancel() {
				context.cancelled = true;
				machine.send('cancel');
			},
			restart() {
				context.cancelled = false;
				machine.send('next');
				machine.send('next');
			},
			confirmDateRanges() {
				if ((context.dateRanges?.ranges?.length ?? 0) > 0) {
					machine.send('next');
				}
			}
		};
		return process;
	};

	exportSnapshot(): WizardPersistedSession {
		return {
			sessionId: this.sessionId,
			updatedAt: Date.now(),
			flushRequested: this.flushRequested,
			files: this.schedulerState.toPersistedFiles()
		};
	}

	private rehydrateFromSnapshot(snapshot: WizardPersistedSession): void {
		this.sessionId = snapshot.sessionId;
		this.flushRequested = snapshot.flushRequested ?? false;
		this.resetRuntimeState();
		this.flushRequested = snapshot.flushRequested ?? false;

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
		this.persistSoon();
	}
}

export const wizardMediatorContext = new Context<WizardMediator>(
	'wizard_mediator'
);

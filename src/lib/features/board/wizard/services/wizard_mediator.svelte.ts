import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import berichtgenStore from '$lib/stores/berichtgen.svelte';
import { createStateMachineForContext } from './state_machine';
import { BerichtgenError } from '$lib/errors';
import { WizardError, EWizardError } from '$wizard/errors';
import { WizardFileContext } from './wizard_file_context';
import type { Scheduler } from 'tesseract.js';
import type {
	ResultEntry,
	WizardDirectories,
	WizardProcessStateMachine
} from '$wizard/types';
import { combineJSONs } from '$wizard/postprocess/combine';
import { WizardStep } from '$wizard/enums';
import {
	createBatchesBySize,
	MAX_BATCH_BYTES,
	sendBatchCompletion
} from '$wizard/completion/completion';
import type { WizardPersistedSession } from './types';
import {
	WIZARD_PERSISTENCE_STORE,
	WIZARD_PERSISTENCE_TTL_MS,
	WIZARD_PERSISTENCE_VERSION
} from '$lib/constants';
import Persistence from '$persistence';
import { ProcessQueue } from './process_queue';
import { debounce } from '$lib/utils';
import { WizardScheduler } from './wizard_scheduler.svelte';
import { get } from 'svelte/store';
import { WizardBatcher } from './wizard_batcher';
import { Chunker, type ChunkDescriptor } from './chunker';

export class WizardMediator {
	readonly schedulerState: WizardScheduler;
	readonly batcher: WizardBatcher;
	readonly queue: ProcessQueue<WizardProcessStateMachine>;
	readonly chunker: Chunker;

	constructor(
		schedulerState: WizardScheduler,
		batcher: WizardBatcher,
		queue: ProcessQueue<WizardProcessStateMachine>,
		chunker: Chunker
	) {
		this.schedulerState = schedulerState;
		this.batcher = batcher;
		this.queue = queue;
		this.chunker = chunker;
	}

	static createDefault() {
		const schedulerState = new WizardScheduler();
		const batcher = new WizardBatcher();
		const chunker = new Chunker();
		// eslint-disable-next-line prefer-const
		let mediatorRef: WizardMediator;

		const queue = new ProcessQueue<WizardProcessStateMachine>(5, {
			onenqueue: (item, index) => {
				if (index < mediatorRef.batchSize) {
					item.machine.next();
				}
			},
			ondequeue: (_removed, nextToStart) => {
				nextToStart?.machine.next();
				if (mediatorRef.isDone) {
					mediatorRef.finish();
				}
				mediatorRef.checkBatchReady();
				mediatorRef.persistSoon();
			}
		});
		mediatorRef = new WizardMediator(schedulerState, batcher, queue, chunker);
		return mediatorRef;
	}

	scheduler: Scheduler | null = null;

	result = $state<Promise<ResultEntry[]> | null>(null);

	processInit = $state<Promise<void> | null>(null);

	isRunning = $derived.by(() => {
		return this.batcher.isRunning;
	});

	workersInUse = 0;

	workersNr = 0;

	userKey: string = 'anon';

	sessionId: string = crypto.randomUUID();

	get isDone() {
		return (
			!this.isRunning &&
			this.schedulerState.schedule !== null &&
			this.schedulerState.filesReady === this.schedulerState.numberOfFiles
		);
	}

	get batchSize() {
		return this.queue.batchSize;
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

	get filesReady() {
		return this.schedulerState.filesReady;
	}

	setUserKey(userId: string | null | undefined) {
		this.userKey = userId ? `user:${userId}` : 'anon';
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
		this.queue.reset();
		this.batcher.reset();
		this.schedulerState.clear();
		this.result = null;
	}

	onFileErrored = () => {
		this.persistSoon();
		this.queue.dequeue();
	};

	onFileCancelled = () => {
		this.persistSoon();
		this.queue.dequeue();
	};

	init = async (session: WizardPersistedSession | null = null) => {
		if (this.scheduler === null) {
			const { createScheduler } = await import('tesseract.js');
			this.scheduler = createScheduler();
		}
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
		this.persistSoon();
	};

	finish = () => {
		this.result = (async () => {
			const finishedDirectories = this.schedulerState.getFinishedDirectories();
			await this.scheduler?.terminate();
			this.scheduler = null;
			const combined = combineJSONs(
				finishedDirectories,
				berichtgenStore.get('constantHours')
			);
			await this.clearPersistedSession();
			return combined;
		})();
	};

	/**
	 * Called by a file's state machine when it enters BATCH_PENDING.
	 * Registers the file in the pending map by id (avoids Svelte proxy reference issues).
	 */
	onFileBatchPending = (id: string) => {
		const file = this.schedulerState.findById(id);
		if (!file) return;
		this.batcher.register(file);
		this.checkBatchReady();
		this.persistSoon();
	};

	/**
	 * Fires when every file has either finished (filesReady) or is waiting in
	 * BATCH_PENDING (batchPendingFiles.size) — i.e. all files have settled.
	 */
	checkBatchReady = () => {
		if (
			this.schedulerState.schedule !== null &&
			this.batcher.size > 0 &&
			this.filesReady + this.batcher.size ===
				this.schedulerState.schedule.length
		) {
			void this.runBatches();
		}
	};

	/** Runs completion batches for all currently pending files. */
	private runBatches = async () => {
		const pendingList = this.takePendingProcesses();
		this.persistSoon();

		const allChunks = this.chunker.expandPendingFiles(pendingList);
		const batches = createBatchesBySize(
			this.chunker.withSizeProxy(allChunks),
			MAX_BATCH_BYTES
		);

		const chunkResults = new SvelteMap<number, SvelteMap<number, string[]>>();
		const startedFileIndices = new SvelteSet<number>();
		const errorCause = await this.processBatches(
			batches,
			pendingList,
			startedFileIndices,
			chunkResults
		);

		this.applyChunkResults(pendingList, allChunks, chunkResults, errorCause);
	};

	private takePendingProcesses() {
		const pendingIds = this.batcher.takePendingIds();
		return pendingIds.map((id) => this.schedulerState.findById(id)!);
	}

	private async processBatches(
		batches: Array<(ChunkDescriptor & { text: string })[]>,
		pendingList: WizardProcessStateMachine[],
		startedFileIndices: SvelteSet<number>,
		chunkResults: SvelteMap<number, SvelteMap<number, string[]>>
	): Promise<BerichtgenError | null> {
		let errorCause: BerichtgenError | null = null;

		for (const batch of batches) {
			this.startBatchFiles(batch, pendingList, startedFileIndices);
			const result = await sendBatchCompletion(
				batch.map(({ routing, ort }) => ({ routing, ort }))
			);
			if (!result.ok) return result.error;

			this.chunker.collectChunkResults(
				batch,
				result.data.results,
				chunkResults
			);
			if (result.data.insufficient_tokens) {
				errorCause = new WizardError(EWizardError.COMPLETION_FAILED);
				break;
			}
		}

		return errorCause;
	}

	private startBatchFiles(
		batch: ChunkDescriptor[],
		pendingList: WizardProcessStateMachine[],
		startedFileIndices: SvelteSet<number>
	) {
		for (const { fileIndex } of batch) {
			if (startedFileIndices.has(fileIndex)) continue;
			pendingList[fileIndex].machine.start();
			startedFileIndices.add(fileIndex);
		}
	}

	private applyChunkResults(
		pendingList: WizardProcessStateMachine[],
		allChunks: ChunkDescriptor[],
		chunkResults: SvelteMap<number, SvelteMap<number, string[]>>,
		errorCause: BerichtgenError | null
	) {
		for (const { process, entries } of this.chunker.applyChunkResults(
			pendingList,
			allChunks,
			chunkResults
		)) {
			if (entries === null) {
				process.context.error =
					errorCause ?? new WizardError(EWizardError.COMPLETION_FAILED);
				process.machine.error();
			} else {
				process.context.snapshot = entries;
				process.machine.next(entries);
			}
			this.persistSoon();
		}
	}

	createProcessStateMachine = (
		context: WizardFileContext,
		id: string = crypto.randomUUID(),
		initialStep: WizardStep = WizardStep.INITIALISING
	) => {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const scheduler = this;

		const machine = createStateMachineForContext(
			context,
			scheduler,
			id,
			initialStep
		);
		// Svelte 5 deep-proxies objects stored in $state — accessing methods here
		// prevents the proxy from hiding them when the machine is retrieved later
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		machine.next;
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		machine.start;
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		machine.error;

		const process: WizardProcessStateMachine = {
			context,
			machine,
			id,
			cancel() {
				context.cancelled = true;
				machine.cancel();
			},
			restart() {
				context.cancelled = false;
				machine.next(process);
			},
			confirmDateRanges() {
				if ((context.dateRanges?.ranges?.length ?? 0) > 0) {
					machine.next();
				}
			}
		};
		return process;
	};

	exportSnapshot(): WizardPersistedSession {
		return {
			sessionId: this.sessionId,
			updatedAt: Date.now(),
			isRunning: this.isRunning,
			filesReady: this.filesReady,
			files: this.schedulerState.toPersistedFiles()
		};
	}

	private rehydrateFromSnapshot(snapshot: WizardPersistedSession): void {
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
			if (get(process.machine) === WizardStep.BATCH_PENDING) {
				this.batcher.register(process);
			}
		}
		if (this.isDone) {
			this.finish();
		} else {
			this.checkBatchReady();
		}
		this.persistSoon();
	}
}

// eslint-disable-next-line prefer-const
export let wizardMediator = WizardMediator.createDefault();

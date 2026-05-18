import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import berichtgenStore from '$lib/stores/berichtgen.svelte';
import { createStateMachineForContext } from './state_machine';
import { BerichtgenError } from '$lib/errors';
import { WizardError, EWizardError } from '$wizard/errors';
import { WizardFileContext } from './wizard_file_context';
import type { Scheduler } from 'tesseract.js';
import type {
	Entry,
	ResultEntry,
	WizardDirectories,
	WizardProcessStateMachine
} from '$wizard/types';
import type { Ort } from '$wizard/enums';
import { combineJSONs } from '$wizard/postprocess/combine';
import { WizardStep } from '$wizard/enums';
import {
	createBatchesBySize,
	MAX_BATCH_BYTES,
	sanitizeToTwoByteUTF8,
	sendBatchCompletion,
	splitTextIntoChunks,
	stringsToEntries
} from '$wizard/completion/completion';
import type { FileRouting } from './file_routing';
import {
	type WizardPersistedFile,
	type WizardPersistedSession
} from './types';
import {
	WIZARD_PERSISTENCE_STORE,
	WIZARD_PERSISTENCE_TTL_MS,
	WIZARD_PERSISTENCE_VERSION
} from '$lib/constants';
import Persistence from '$persistence';
import { get } from 'svelte/store';

/**
 * Internal representation of one routed file chunk that will be sent to the AI.
 *
 * - Text files may be split into multiple chunks when they exceed MAX_BATCH_BYTES.
 * - Inline and GCS files are always a single chunk (chunkIndex is always 0).
 */
type ChunkDescriptor = {
	file: WizardProcessStateMachine;
	routing: FileRouting;
	ort: Ort;
	/** Index of the originating file within the pending list (stable across batches). */
	fileIndex: number;
	/** 0-based position of this chunk within its file. */
	chunkIndex: number;
};

export class WizardScheduler {
	queue: WizardProcessStateMachine[] = [];

	schedule: WizardProcessStateMachine[] | null = $state(null);

	numberOfFiles = $derived.by(() => {
		if (this.schedule === null) return 0;
		return this.schedule.length;
	});

	filesReady = $derived.by(() => {
		if (this.schedule === null) return 0;
		return this.schedule.filter(
			(process) =>
				process.context.finished !== null ||
				process.context.error !== undefined ||
				process.context.cancelled
		).length;
	});

	scheduler: Scheduler | null = null;

	result = $state<Promise<ResultEntry[]> | null>(null);

	processInit = $state<Promise<void> | null>(null);

	isRunning = $derived.by(() => {
		if (this.batchPendingFiles === null) return false;
		return this.batchPendingFiles.size > 0;
	});

	workersInUse = 0;

	workersNr = 0;

	userKey: string = 'anon';

	sessionId: string = crypto.randomUUID();

	private persistTimer: ReturnType<typeof setTimeout> | null = null;

	private persistDebounceMs = 250;

	/**
	 * Files that have been parsed, dated, and are waiting to be grouped into
	 * a batch AI request. Keyed by file id for O(1) deduplication.
	 */
	batchPendingFiles: SvelteMap<string, WizardProcessStateMachine> =
		new SvelteMap();

	get isDone() {
		return (
			!this.isRunning &&
			this.schedule !== null &&
			this.filesReady === this.numberOfFiles
		);
	}

	get batchSize() {
		return 5;
	}

	setUserKey(userId: string | null | undefined) {
		this.userKey = userId ? `user:${userId}` : 'anon';
	}

	persistSoon = () => {
		if (this.persistTimer) clearTimeout(this.persistTimer);
		this.persistTimer = setTimeout(() => {
			void this.persistNow();
		}, this.persistDebounceMs);
	};

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
		this.queue = [];
		this.result = null;
		this.batchPendingFiles.clear();
	}

	enqueue = (item: WizardProcessStateMachine) => {
		this.queue.push(item);
		this.persistSoon();
		if (this.queue.length <= this.batchSize) {
			this.queue.at(-1)!.machine.next();
		}
	};

	onFileErrored = () => {
		this.persistSoon();
		this.dequeue();
	};

	onFileCancelled = () => {
		this.persistSoon();
		this.dequeue();
	};

	dequeue = (): WizardProcessStateMachine | undefined => {
		const shifted = this.queue.shift();
		this.queue.at(this.batchSize)?.machine.next();
		if (this.isDone) {
			this.finish();
		}
		this.checkBatchReady();
		this.persistSoon();
		return shifted;
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
		this.schedule = [...directories]
			.flat()
			.map((entry) =>
				this.createProcessStateMachine(new WizardFileContext(entry))
			);
		this.persistSoon();
	};

	finish = () => {
		this.result = (async () => {
			const finishedDirectories = this.schedule!.reduce((prev, { context }) => {
				if (context.finished != null) return [...prev, context.finished];
				return prev;
			}, [] as Required<Entry>[][]);
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
		const file = this.schedule!.find((f) => f.id === id);
		if (!file) return;
		this.batchPendingFiles.set(id, file);
		this.checkBatchReady();
		this.persistSoon();
	};

	/**
	 * Fires when every file has either finished (filesReady) or is waiting in
	 * BATCH_PENDING (batchPendingFiles.size) — i.e. all files have settled.
	 */
	private checkBatchReady = () => {
		if (
			this.schedule !== null &&
			this.batchPendingFiles.size > 0 &&
			this.filesReady + this.batchPendingFiles.size === this.schedule.length
		) {
			void this.runBatches();
		}
	};

	/**
	 * Expands a list of pending files into `ChunkDescriptor` entries.
	 *
	 * - `text` routings are sanitised and split into equal-sized chunks when they
	 *   exceed `MAX_BATCH_BYTES`, so each chunk fits within a single batch.
	 * - `inline` and `gcs` routings are never split — they always produce exactly
	 *   one descriptor since their sizes are already bounded by the routing decision.
	 */
	private expandIntoChunks(
		pendingList: WizardProcessStateMachine[]
	): ChunkDescriptor[] {
		const chunks: ChunkDescriptor[] = [];
		for (let fi = 0; fi < pendingList.length; fi++) {
			const file = pendingList[fi];
			const routing = file.context.snapshot as FileRouting;
			const ort = file.context.dateRanges!.ort;

			if (routing.type === 'text') {
				// Text files may be large — sanitise and split as before.
				const sanitised = sanitizeToTwoByteUTF8(routing.text);
				const textChunks = splitTextIntoChunks(sanitised, MAX_BATCH_BYTES);
				for (let ci = 0; ci < textChunks.length; ci++) {
					chunks.push({
						file,
						routing: { type: 'text', text: textChunks[ci] },
						ort,
						fileIndex: fi,
						chunkIndex: ci
					});
				}
			} else {
				// Inline, Files API, and URL items are already size-bounded — one chunk each.
				chunks.push({ file, routing, ort, fileIndex: fi, chunkIndex: 0 });
			}
		}
		return chunks;
	}

	/**
	 * Processes all `batchPendingFiles` in sequential batches of at most 4 MB.
	 *
	 * Flow:
	 * 1. Expand files into chunks (splitting files > 4 MB into equal chunks).
	 * 2. Group chunks into ≤ 4 MB batches.
	 * 3. For each batch: transition those files to AI_COMPLETION, send request
	 *    (server runs Gemini calls in parallel within the batch), collect results.
	 * 4. Reassemble chunk results back into per-file entries.
	 * 5. On any failure or `insufficient_tokens`, error all remaining files and halt.
	 */
	private runBatches = async () => {
		// Snapshot pending ids and clear — look machines up from schedule (single proxy layer)
		// rather than iterating SvelteMap values, which can double-proxy the machine objects
		const pendingIds = [...this.batchPendingFiles.keys()];
		this.batchPendingFiles.clear();
		this.persistSoon();

		const pendingList = pendingIds.map(
			(id) => this.schedule!.find((f) => f.id === id)!
		);
		const allChunks = this.expandIntoChunks(pendingList);
		// For batching purposes, provide a `text` proxy so `createBatchesBySize` can
		// measure byte sizes: text chunks use their actual content; inline items use
		// the decoded byte size; GCS items contribute 0 bytes (Vercel never sees them).
		const chunksWithSize = allChunks.map((c) => ({
			...c,
			text:
				c.routing.type === 'text'
					? c.routing.text
					: c.routing.type === 'inline'
						? // Approximate decoded size from base64 length.
							'x'.repeat(Math.ceil((c.routing.data.length * 3) / 4))
						: '' // GCS: 0 bytes from Vercel's perspective
		}));
		const batches = createBatchesBySize(chunksWithSize, MAX_BATCH_BYTES);

		// chunkResults[fileIndex][chunkIndex] = AI string[] for that chunk
		const chunkResults = new SvelteMap<number, SvelteMap<number, string[]>>();
		const startedFileIndices = new SvelteSet<number>();

		let errorCause: BerichtgenError | null = null;
		let batchHalted = false;

		for (const batch of batches) {
			if (batchHalted) break;

			// Transition each file's machine to AI_COMPLETION on its first chunk
			for (const { fileIndex } of batch) {
				if (!startedFileIndices.has(fileIndex)) {
					pendingList[fileIndex].machine.start();
					startedFileIndices.add(fileIndex);
				}
			}

			const items = batch.map(({ routing, ort }) => ({ routing, ort }));
			const result = await sendBatchCompletion(items);

			if (!result.ok) {
				errorCause = result.error;
				batchHalted = true;
				break;
			}

			const { results, insufficient_tokens } = result.data;

			for (let i = 0; i < batch.length; i++) {
				const { fileIndex, chunkIndex } = batch[i];
				const chunkResult = results[i];
				if (chunkResult != null) {
					if (!chunkResults.has(fileIndex)) {
						chunkResults.set(fileIndex, new SvelteMap());
					}
					chunkResults.get(fileIndex)!.set(chunkIndex, chunkResult);
				}
			}

			if (insufficient_tokens) {
				errorCause = new WizardError(EWizardError.COMPLETION_FAILED);
				batchHalted = true;
			}
		}

		// Distribute results — reassemble chunks in order for each file
		for (let fi = 0; fi < pendingList.length; fi++) {
			const file = pendingList[fi];
			const fileChunks = allChunks
				.filter((c) => c.fileIndex === fi)
				.sort((a, b) => a.chunkIndex - b.chunkIndex);
			const fileChunkMap = chunkResults.get(fi);
			const allPresent = fileChunks.every((c) =>
				fileChunkMap?.has(c.chunkIndex)
			);

			if (!allPresent) {
				file.context.error =
					errorCause ?? new WizardError(EWizardError.COMPLETION_FAILED);
				file.machine.error();
			} else {
				const combined = fileChunks.flatMap(
					(c) => fileChunkMap!.get(c.chunkIndex)!
				);
				const entries = stringsToEntries(combined);
				file.context.snapshot = entries;
				file.machine.next(entries);
			}
			this.persistSoon();
		}
	};

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
		const files: WizardPersistedFile[] = (this.schedule ?? []).map(
			(process) => ({
				id: process.id,
				step: get(process.machine),
				...process.context,
				error: process.context.error?.apiError
			})
		);

		return {
			sessionId: this.sessionId,
			updatedAt: Date.now(),
			isRunning: this.isRunning,
			filesReady: this.filesReady,
			files
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

		this.schedule = restored;

		for (const process of restored) {
			if (get(process.machine) === WizardStep.BATCH_PENDING) {
				this.batchPendingFiles.set(process.id, process);
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
export let wizardScheduler = new WizardScheduler();

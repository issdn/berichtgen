import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { berichtgenStore } from '$lib/stores/berichtgen.svelte';
import { createStateMachineForContext } from './state_machine';
import { ***REMOVED***Error } from '$lib/errors';
import { WizardError, EWizardError } from '$wizard/errors';
import { WizardFileContext } from './wizard_file_context.svelte';
import type { Scheduler } from 'tesseract.js';
import type {
	Entry,
	ResultEntry,
	WizardDirectories,
	WizardDirectoryEntry,
	WizardProcessStateMachine
} from '$wizard/types';
import type { Ort } from '$wizard/enums';
import { combineJSONs } from '$wizard/postprocess/combine';
import {
	createBatchesBySize,
	MAX_BATCH_BYTES,
	sanitizeToTwoByteUTF8,
	sendBatchCompletion,
	splitTextIntoChunks,
	stringsToEntries
} from '$wizard/completion/completion';
import type { FileRouting } from './file_routing';

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

	filesReady = $state(0);

	filesUnfinished = $state(0);

	scheduler: Scheduler | null = null;

	result = $state<Promise<ResultEntry[]> | null>(null);

	processInit = $state<Promise<void> | null>(null);

	isRunning = $state(false);

	workersInUse = 0;

	workersNr = 0;

	/**
	 * Files that have been parsed, dated, and are waiting to be grouped into
	 * a batch AI request. Keyed by file id for O(1) deduplication.
	 */
	batchPendingFiles: SvelteMap<string, WizardProcessStateMachine> =
		new SvelteMap();

	get isDone() {
		return this.schedule !== null && this.filesReady === this.numberOfFiles;
	}

	get batchSize() {
		return 5;
	}

	enqueue = (item: WizardProcessStateMachine) => {
		this.queue.push(item);
		if (this.queue.length <= this.batchSize) {
			this.queue.at(-1)!.machine.next();
		}
	};

	dequeue = (): WizardProcessStateMachine | undefined => {
		const shifted = this.queue.shift();
		this.filesReady += 1;
		this.queue.at(this.batchSize)?.machine.next();
		if (this.isDone) {
			this.finish();
		}
		this.checkBatchReady();
		return shifted;
	};

	init = async () => {
		this.isRunning = true;
		if (this.scheduler === null) {
			const { createScheduler } = await import('tesseract.js');
			this.scheduler = createScheduler();
		}
		this.queue = [];
		this.result = null;
		this.filesReady = 0;
		this.filesUnfinished = 0;
		this.batchPendingFiles.clear();
	};

	createSchedule = (directories: WizardDirectories) => {
		this.schedule = [...directories].flat().map(this.createProcessStateMachine);
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
				berichtgenStore.constantHours
			);
			this.isRunning = false;
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

		let errorCause: ***REMOVED***Error | null = null;
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
					errorCause ??
					new WizardError(EWizardError.COMPLETION_FAILED);
				file.machine.error();
			} else {
				const combined = fileChunks.flatMap(
					(c) => fileChunkMap!.get(c.chunkIndex)!
				);
				const entries = stringsToEntries(combined);
				file.context.snapshot = entries;
				file.machine.next(entries);
			}
		}
	};

	createProcessStateMachine = (entry: WizardDirectoryEntry) => {
		const id = crypto.randomUUID();
		const fileOrUrl = 'file' in entry ? entry.file : entry.url;
		const context = new WizardFileContext(fileOrUrl, entry.config ?? null);
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const scheduler = this;

		const machine = createStateMachineForContext(context, scheduler, id);
		// Svelte 5 deep-proxies objects stored in $state — accessing methods here
		// prevents the proxy from hiding them when the machine is retrieved later
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		machine.next;
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		machine.start;
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		machine.error;
		return { context, machine, id };
	};
}

// eslint-disable-next-line prefer-const
export let wizardScheduler = new WizardScheduler();

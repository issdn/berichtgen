import { SvelteMap } from 'svelte/reactivity';
import type { Ort } from '$wizard/enums';
import type { Entry, WizardProcessStateMachine } from '$wizard/types';
import type { FileRouting } from './file_routing';
import {
	MAX_BATCH_BYTES,
	sanitizeToTwoByteUTF8,
	splitTextIntoChunks,
	stringsToEntries
} from '$wizard/completion/completion';

export type ChunkDescriptor = {
	file: WizardProcessStateMachine;
	routing: FileRouting;
	ort: Ort;
	fileIndex: number;
	chunkIndex: number;
};

type ChunkWithSize = ChunkDescriptor & { text: string };

export type FileChunkOutcome = {
	process: WizardProcessStateMachine;
	entries: Entry[] | null;
};

export class Chunker {
	/**
	 * Builds chunk descriptors from pending files.
	 * Text routings are split into MAX_BATCH_BYTES-sized parts.
	 */
	expandPendingFiles(
		pendingList: WizardProcessStateMachine[]
	): ChunkDescriptor[] {
		const chunks: ChunkDescriptor[] = [];
		for (let fileIndex = 0; fileIndex < pendingList.length; fileIndex++) {
			const process = pendingList[fileIndex];
			const routing = process.context.snapshot as FileRouting;
			const ort = process.context.dateRanges!.ort;

			if (routing.type === 'text') {
				const textChunks = splitTextIntoChunks(
					sanitizeToTwoByteUTF8(routing.text),
					MAX_BATCH_BYTES
				);
				for (let chunkIndex = 0; chunkIndex < textChunks.length; chunkIndex++) {
					chunks.push({
						file: process,
						routing: { type: 'text', text: textChunks[chunkIndex] },
						ort,
						fileIndex,
						chunkIndex
					});
				}
				continue;
			}

			chunks.push({ file: process, routing, ort, fileIndex, chunkIndex: 0 });
		}
		return chunks;
	}

	/**
	 * Adds a `text` size proxy field for batching by payload size.
	 */
	withSizeProxy(chunks: ChunkDescriptor[]): ChunkWithSize[] {
		return chunks.map((chunk) => ({
			...chunk,
			text: this.toSizeProxyText(chunk.routing)
		}));
	}

	/**
	 * Reassembles chunked AI results back into per-file entries.
	 * Returns `null` when at least one chunk is missing for that file.
	 */
	reassembleFileResult(
		fileIndex: number,
		allChunks: ChunkDescriptor[],
		chunkResults: SvelteMap<number, SvelteMap<number, string[]>>
	) {
		const fileChunks = allChunks
			.filter((chunk) => chunk.fileIndex === fileIndex)
			.sort((a, b) => a.chunkIndex - b.chunkIndex);

		const perFileChunkResults = chunkResults.get(fileIndex);
		const hasAllChunks = fileChunks.every((chunk) =>
			perFileChunkResults?.has(chunk.chunkIndex)
		);
		if (!hasAllChunks) return null;

		const merged = fileChunks.flatMap(
			(chunk) => perFileChunkResults!.get(chunk.chunkIndex)!
		);
		return stringsToEntries(merged);
	}

	collectChunkResults(
		batch: ChunkDescriptor[],
		results: (string[] | null)[],
		chunkResults: SvelteMap<number, SvelteMap<number, string[]>>
	) {
		for (let i = 0; i < batch.length; i++) {
			const { fileIndex, chunkIndex } = batch[i];
			const chunkResult = results[i];
			if (chunkResult == null) continue;
			if (!chunkResults.has(fileIndex)) {
				chunkResults.set(fileIndex, new SvelteMap());
			}
			chunkResults.get(fileIndex)!.set(chunkIndex, chunkResult);
		}
	}

	applyChunkResults(
		pendingList: WizardProcessStateMachine[],
		allChunks: ChunkDescriptor[],
		chunkResults: SvelteMap<number, SvelteMap<number, string[]>>
	): FileChunkOutcome[] {
		const outcomes: FileChunkOutcome[] = [];
		for (let fileIndex = 0; fileIndex < pendingList.length; fileIndex++) {
			const process = pendingList[fileIndex];
			const entries = this.reassembleFileResult(
				fileIndex,
				allChunks,
				chunkResults
			);
			outcomes.push({ process, entries });
		}
		return outcomes;
	}

	private toSizeProxyText(routing: FileRouting): string {
		if (routing.type === 'text') return routing.text;
		if (routing.type === 'inline') {
			return 'x'.repeat(Math.ceil((routing.data.length * 3) / 4));
		}
		return '';
	}
}

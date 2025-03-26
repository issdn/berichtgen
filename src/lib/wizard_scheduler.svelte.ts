import type { Scheduler } from 'tesseract.js';
import type { Entry } from './types';
import { combineJSONs } from './parse/combine';
import { parseDOCX, parseDOCXData } from '$lib/parse/docx_parser';
import { IncuriaError, IncuriaErrorType, WizardStep } from '$lib/types';
import { getCompletions } from '$lib/hooks/completion';
import { spreadEntriesAcrossWeeks } from '$lib/parse/time_spread';

class WizardScheduler {
	batchSize = 5;

	files: FileList | null = $state(null);

	schedule: { wizardFile: WizardFileProcess; processFunction: () => Promise<void> }[] | null =
		$derived.by(() => {
			if (this.files === null || this.files.length === 0) return null;
			return [...this.files!].map((file) => {
				const wizardFile = new WizardFileProcess(file);
				const processFunction = () =>
					this.processFiles(file, wizardFile, async (text: Required<Entry>[]) => {
						this.finished = [...(this.finished ?? []), text];
						this.filesReady += 1;
						if (this.files !== null && this.finished.length === this.files.length) {
							this.finish();
						} else {
							this.schedule?.at(this.filesReady)?.processFunction();
						}
					});
				return { wizardFile, processFunction };
			});
		});

	finished = $state<Required<Entry>[][] | null>(null);

	filesReady = $state(0);

	scheduler: Scheduler | null = null;

	result = $state<Promise<string> | null>(null);

	processInit = $state<Promise<void> | null>(null);

	async init() {
		this.scheduler = await this.createWorkerPool();
		this.result = null;
		this.finished = null;
		this.filesReady = 0;
		for (let i = 0; i < this.batchSize; i++) {
			this.schedule?.at(i)?.processFunction();
		}
	}

	finish() {
		this.result = (async () => {
			const result = combineJSONs(this.finished ?? []);
			await this.scheduler?.terminate();
			const blob = new Blob([JSON.stringify(result)], { type: 'application/json' });
			return URL.createObjectURL(blob);
		})();
	}

	async createWorkerPool() {
		const { createScheduler, createWorker } = await import('tesseract.js');
		const scheduler = createScheduler();
		for (let i = 0; i < clamp(this.files!.length * 0.1, 1, 25); i++) {
			scheduler.addWorker(await createWorker('deu'));
		}
		return scheduler;
	}

	async processFiles(
		file: File,
		progress: WizardFileProcess,
		onResult: (result: Required<Entry>[]) => void
	) {
		try {
			const data = new Uint8Array(await file.arrayBuffer());
			if (data === null)
				throw new IncuriaError(IncuriaErrorType.INVALID_FILE, 'Unbekannter Fehler');
			else {
				const docxData = await parseDOCXData(data, wizardScheduler.scheduler);
				progress.max = docxData.textsOrRelIds.length;
				const text = (
					await parseDOCX(docxData, {
						scheduler: wizardScheduler.scheduler,
						onChunkFinished() {
							progress.value += 1;
						}
					})
				).join('\n');
				const completion = await getCompletions({
					text,
					apiKey: 'sk-a75d88242ebe42bb9e14ebd1b6c8124f'
				});
				const timed = spreadEntriesAcrossWeeks(completion, [
					{ startDate: '2025-3-25', endDate: '2025-3-26' }
				]);
				progress.step = { step: WizardStep.DONE };
				onResult(timed);
			}
		} catch (e) {
			if (e instanceof Error) {
				progress.step = { step: WizardStep.ERROR, message: e.message };
			} else {
				progress.step = { step: WizardStep.ERROR, message: 'Unbekannter Fehler' };
			}
		}
	}
}

// eslint-disable-next-line prefer-const
export let wizardScheduler = new WizardScheduler();

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

export class WizardFileProcess {
	value: number = $state(0);

	max: number = $state(0);

	step: { step: WizardStep; message?: string } = $state({ step: WizardStep.PROCESSING });

	file: File;

	constructor(file: File) {
		this.file = file;
	}
}

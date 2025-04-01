import type { Scheduler } from 'tesseract.js';
import type { Entry } from './types';
import { combineJSONs } from './parse/combine';
import { parseDOCX, parseDOCXData } from '$lib/parse/docx_parser';
import { IncuriaError, IncuriaErrorType, WizardStep } from '$lib/types';
import { getCompletions } from '$lib/hooks/completion';
import { spreadEntriesAcrossWeeks } from '$lib/parse/time_spread';
import { parsePDF, parsePDFData } from './parse/pdf_parser';
import fsm from 'svelte-fsm';
import { today } from '@internationalized/date';
import type { DateRangeSchema } from './components/time_spread_schematic';

export class WizardScheduler {
	batchSize = 5;

	files: FileList | null = $state(null);

	schedule: ReturnType<WizardScheduler['createProcessStateMachine']>[] | null = $derived.by(() => {
		if (this.files === null || this.files.length === 0) return null;
		return [...this.files!].map((file) => {
			return this.createProcessStateMachine(file);
		});
	});

	finished = $state<Required<Entry>[][] | null>(null);

	filesReady = $state(0);

	scheduler: Scheduler | null = null;

	result = $state<Promise<string> | null>(null);

	processInit = $state<Promise<void> | null>(null);

	async init() {
		const { createScheduler } = await import('tesseract.js');
		this.scheduler = createScheduler();
		this.result = null;
		this.finished = null;
		this.filesReady = 0;
		for (let i = 0; i < this.batchSize; i++) {
			this.schedule?.at(i)?.machine.run();
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

	async createWorkerPool(nrImages: number) {
		const { createWorker } = await import('tesseract.js');
		for (let i = 0; i < clamp(nrImages * 0.1, 1, 25); i++) {
			this.scheduler!.addWorker(await createWorker('deu'));
		}
	}

	async parseByFileType(file: File, progress: WizardFileProcess) {
		function onProgress() {
			progress.value += 1;
		}
		const data = new Uint8Array(await file.arrayBuffer());
		if (data === null) throw new IncuriaError(IncuriaErrorType.INVALID_FILE, 'Unbekannter Fehler');
		switch (file.type) {
			case 'application/pdf': {
				const { nrImages, blobsOrNullsAndPages } = await parsePDFData(data);
				await this.createWorkerPool(nrImages);
				progress.max = blobsOrNullsAndPages.length;
				return await parsePDF(
					blobsOrNullsAndPages,
					{
						scheduler: this.scheduler,
						getNewCanvas(width, height) {
							const canvas = new OffscreenCanvas(width, height);
							const context = canvas.getContext('2d')!;
							return { canvas, context };
						}
					},
					onProgress
				);
			}
			case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
				const docxData = await parseDOCXData(data, wizardScheduler.scheduler);
				await this.createWorkerPool(docxData.images.size);
				progress.max = docxData.textsOrRelIds.length;
				return await parseDOCX(docxData, this.scheduler, onProgress);
			}
			default:
				throw new IncuriaError(IncuriaErrorType.INVALID_FILE, 'Dateityp nicht unterstützt.');
		}
	}

	createProcessStateMachine(file: File) {
		const progress = new WizardFileProcess(file);
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const scheduler = this;
		const machine = fsm(WizardStep.INITIALISING, {
			[WizardStep.INITIALISING]: {
				_enter() {
					progress.step = WizardStep.INITIALISING;
				},
				run: WizardStep.PROCESSING
			},
			[WizardStep.PROCESSING]: {
				_enter() {
					progress.step = WizardStep.PROCESSING;
					scheduler
						.parseByFileType(file, progress)
						.then((value) => {
							progress.snapshot = value.join('\n');
							this.next();
						})
						.catch((e) => {
							if (e instanceof Error) {
								progress.message = e.message;
							} else {
								progress.message = 'Unbekannter Fehler bei Verarbeitung.';
							}
							this.error();
						});
				},
				next: () => WizardStep.AI_COMPLETION,
				error: () => WizardStep.ERROR
			},
			[WizardStep.AI_COMPLETION]: {
				_enter() {
					progress.step = WizardStep.AI_COMPLETION;
					getCompletions({
						text: progress.snapshot as string,
						apiKey: 'sk-a75d88242ebe42bb9e14ebd1b6c8124f'
					})
						.then((value) => {
							progress.snapshot = value;
							this.next();
						})
						.catch((e) => {
							if (e instanceof Error) {
								progress.message = e.message;
							} else {
								progress.message = 'Unbekannter Fehler bei Umformulierung.';
							}
							this.error();
						});
				},
				next: () => WizardStep.TIME_SPREADING,
				error: () => WizardStep.ERROR
			},
			[WizardStep.WAITING]: {
				_enter() {
					progress.step = WizardStep.WAITING;
				},
				stop: WizardStep.TIME_SPREADING
			},
			[WizardStep.TIME_SPREADING]: {
				_enter() {
					progress.step = WizardStep.TIME_SPREADING;
					if (!progress.dateRanges) {
						this.wait();
					}
					try {
						progress.snapshot = spreadEntriesAcrossWeeks(progress.snapshot as Entry[], [
							{
								daterange: {
									start: today('Europe/Berlin').subtract({ weeks: 3 }),
									end: today('Europe/Berlin')
								}
							}
						]);
						this.next();
					} catch (e) {
						if (e instanceof Error) {
							progress.message = e.message;
						} else {
							progress.message = 'Unbekannter Fehler bei Umformulierung.';
						}
						this.error();
					}
				},
				next: () => WizardStep.DONE,
				error: () => WizardStep.ERROR,
				wait: () => WizardStep.WAITING
			},
			[WizardStep.DONE]: {
				_enter() {
					progress.step = WizardStep.DONE;
					scheduler.finished = [
						...(scheduler.finished ?? []),
						progress.snapshot as Required<Entry>[]
					];
					scheduler.filesReady += 1;
					if (scheduler.files !== null && scheduler.finished.length === scheduler.files.length) {
						scheduler.finish();
					} else {
						scheduler.schedule?.at(scheduler.filesReady + scheduler.batchSize)?.machine.run();
					}
				}
			},
			[WizardStep.ERROR]: {
				_enter() {
					progress.step = WizardStep.ERROR;
					scheduler.filesReady += 1;
					if (scheduler.files !== null && scheduler.finished?.length === scheduler.files.length) {
						scheduler.finish();
					} else {
						scheduler.schedule?.at(scheduler.filesReady + scheduler.batchSize)?.machine.run();
					}
				}
			}
		});
		return { progress, machine };
	}
}

// eslint-disable-next-line prefer-const
export let wizardScheduler = new WizardScheduler();

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

export class WizardFileProcess {
	snapshot: string | Entry[] | Required<Entry[]> | undefined;

	dateRanges: DateRangeSchema['values'] | null = $state(null);

	value: number = $state(0);

	max: number = $state(0);

	step: WizardStep = $state(WizardStep.INITIALISING);

	message?: string;

	file: File;

	constructor(file: File) {
		this.file = file;
	}
}

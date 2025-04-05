import type { Scheduler } from 'tesseract.js';
import type { Entry } from './types';
import { combineJSONs } from './parse/combine';
import { parseDOCX, parseDOCXData } from '$lib/parse/docx_parser';
import { IncuriaError, IncuriaErrorType, WizardStep } from '$lib/types';
import { getCompletions } from '$lib/hooks/completion';
import { spreadEntriesAcrossWeeks } from '$lib/parse/time_spread';
import { parsePDF, parsePDFData } from './parse/pdf_parser';
import fsm from 'svelte-fsm';
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

	filesReady = $state(0);

	scheduler: Scheduler | null = null;

	result = $state<Promise<string> | null>(null);

	processInit = $state<Promise<void> | null>(null);

	async init() {
		const { createScheduler } = await import('tesseract.js');
		this.scheduler = createScheduler();
		this.result = null;
		this.filesReady = 0;
		for (let i = 0; i < this.batchSize; i++) {
			this.schedule?.at(i)?.machine.run();
		}
	}

	finish() {
		this.result = (async () => {
			const finishedFiles = this.schedule!.reduce((prev, { context }) => {
				if (context.finished != null) return [...prev, context.finished];
				return prev;
			}, [] as Required<Entry>[][]);
			const result = combineJSONs(finishedFiles);
			await this.scheduler?.terminate();
			const blob = new Blob([JSON.stringify(result)], { type: 'application/json' });
			return URL.createObjectURL(blob);
		})();
	}

	async createWorkerPool(nrImages: number) {
		const { createWorker } = await import('tesseract.js');
		const nrWorkers = clamp(nrImages * 0.1, 1, 25);
		for (let i = 0; i < nrWorkers; i++) {
			this.scheduler!.addWorker(await createWorker('deu'));
		}
		return nrWorkers;
	}

	async parseByFileType(file: File, context: WizardFileContext) {
		function onProgress() {
			context.value += 1;
		}
		const data = new Uint8Array(await file.arrayBuffer());
		if (data === null) throw new IncuriaError(IncuriaErrorType.INVALID_FILE, 'Unbekannter Fehler');
		switch (file.type) {
			case 'application/pdf': {
				const { nrImages, blobsOrNullsAndPages } = await parsePDFData(data);
				await this.createWorkerPool(nrImages);
				context.max = blobsOrNullsAndPages.length;
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
				const batchSize = await this.createWorkerPool(docxData.images.size);
				context.max = docxData.textsOrRelIds.length;
				return await parseDOCX(docxData, batchSize, this.scheduler, onProgress);
			}
			default:
				throw new IncuriaError(IncuriaErrorType.INVALID_FILE, 'Dateityp nicht unterstützt.');
		}
	}

	createProcessStateMachine(file: File) {
		const context = new WizardFileContext(file);
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const scheduler = this;
		function onFileDone() {
			scheduler.filesReady += 1;
			if (scheduler.files !== null && scheduler.filesReady === scheduler.files.length) {
				scheduler.finish();
			} else {
				scheduler.schedule?.at(scheduler.filesReady + scheduler.batchSize)?.machine.run();
			}
		}
		const machine = fsm(WizardStep.INITIALISING, {
			[WizardStep.INITIALISING]: {
				run: WizardStep.PROCESSING
			},
			[WizardStep.PROCESSING]: {
				_enter() {
					if (context.cancelled) {
						this.cancel();
						return;
					}
					scheduler
						.parseByFileType(file, context)
						.then((value) => {
							context.snapshot = value.join('\n');
							this.next();
						})
						.catch((e) => {
							if (e instanceof Error) {
								context.message = e.message;
							} else {
								context.message = 'Unbekannter Fehler bei Verarbeitung.';
							}
							this.error();
						});
				},
				next: () => WizardStep.AI_COMPLETION,
				error: () => WizardStep.ERROR,
				cancel: () => WizardStep.CANCELLED
			},
			[WizardStep.AI_COMPLETION]: {
				_enter() {
					if (context.cancelled) {
						this.cancel();
						return;
					}
					getCompletions({
						text: context.snapshot as string,
						apiKey: 'sk-a75d88242ebe42bb9e14ebd1b6c8124f'
					})
						.then((value) => {
							context.snapshot = value;
							this.next();
						})
						.catch((e) => {
							if (e instanceof Error) {
								context.message = e.message;
							} else {
								context.message = 'Unbekannter Fehler bei Umformulierung.';
							}
							this.error();
						});
				},
				next: () => WizardStep.TIME_SPREADING,
				error: () => WizardStep.ERROR,
				cancel: () => WizardStep.CANCELLED
			},
			[WizardStep.WAITING]: {
				_enter() {
					if (context.cancelled) {
						this.cancel();
						return;
					}
				},
				run: WizardStep.TIME_SPREADING,
				cancel: () => WizardStep.CANCELLED
			},
			[WizardStep.TIME_SPREADING]: {
				_enter() {
					if (context.cancelled) {
						this.cancel();
						return;
					}
					if (context.dateRanges.length === 0) {
						this.wait();
						return;
					}
					try {
						context.snapshot = spreadEntriesAcrossWeeks(
							context.snapshot as Entry[],
							context.dateRanges
						);
						this.next();
					} catch (e) {
						if (e instanceof Error) {
							context.message = e.message;
						} else {
							context.message = 'Unbekannter Fehler bei Umformulierung.';
						}
						this.error();
					}
				},
				next: () => WizardStep.DONE,
				error: () => WizardStep.ERROR,
				wait: () => WizardStep.WAITING,
				cancel: () => WizardStep.CANCELLED
			},
			[WizardStep.DONE]: {
				_enter() {
					if (context.cancelled) {
						this.cancel();
						return;
					}
					context.finished = context.snapshot as Required<Entry>[];
					onFileDone();
				},
				cancel: () => WizardStep.CANCELLED
			},
			[WizardStep.ERROR]: {
				_enter() {
					onFileDone();
				}
			},
			[WizardStep.CANCELLED]: {
				_enter() {
					onFileDone();
				}
			}
		});
		return { context, machine };
	}
}

// eslint-disable-next-line prefer-const
export let wizardScheduler = new WizardScheduler();

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

export class WizardFileContext {
	snapshot: string | Entry[] | Required<Entry>[] | undefined;

	finished: Required<Entry>[] | null = null;

	dateRanges: DateRangeSchema['values'] = $state([]);

	value: number = $state(0);

	max: number = $state(0);

	message?: string;

	file: File;

	cancelled: boolean = false;

	constructor(file: File) {
		this.file = file;
	}
}

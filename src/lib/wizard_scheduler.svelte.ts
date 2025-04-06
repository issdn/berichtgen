import type { Scheduler } from 'tesseract.js';
import type { Entry } from './types';
import { combineJSONs } from './parse/combine';
import { IncuriaError, IncuriaErrorType, WizardStep } from '$lib/types';
import { getCompletions } from '$lib/hooks/completion';
import { spreadEntriesAcrossWeeks } from '$lib/parse/time_spread';
import { PDFParser } from './parse/pdf_parser';
import fsm from 'svelte-fsm';
import type { DateRangeSchema } from './components/time_spread_schematic';
import { DOCXParser } from './parse/docx_parser';

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

	workersInUse = 0;

	workersNr = 0;

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

	async parseByFileType(file: File, context: WizardFileContext) {
		const data = new Uint8Array(await file.arrayBuffer());
		if (data === null) throw new IncuriaError(IncuriaErrorType.INVALID_FILE, 'Unbekannter Fehler');
		switch (file.type) {
			case 'application/pdf': {
				const pdfParser = new PDFParser(context, this.scheduler, (width, height) => {
					const canvas = new OffscreenCanvas(width, height);
					const context = canvas.getContext('2d')!;
					return { canvas, context };
				});
				await pdfParser.init(data);
				return await pdfParser.parse();
			}
			case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
				const docxParser = new DOCXParser(context, this.scheduler);
				await docxParser.init(data);
				return await docxParser.parse();
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
					getCompletions(context.snapshot as string)
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

export class WizardFileContext {
	snapshot: string | Entry[] | Required<Entry>[] | undefined;

	finished: Required<Entry>[] | null = null;

	dateRanges: DateRangeSchema['values'] = $state([]);

	value: number = $state(0);

	max: number = $state(0);

	message?: string;

	file: File;

	cancelled: boolean = false;

	onProgress() {
		this.value += 1;
	}

	constructor(file: File) {
		this.file = file;
	}
}

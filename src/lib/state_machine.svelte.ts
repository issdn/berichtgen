import { DOCXParser } from '$lib/parse/docx_parser';
import { incuriaStore } from '$lib/stores/board.svelte';
import { PDFParser } from '$lib/parse/pdf_parser';
import { IncuriaErrorType, WizardStep, type Entry } from '$lib/types';
import type { WizardScheduler } from '$lib/wizard_scheduler.svelte';
import fsm from 'svelte-fsm';
import type { Scheduler } from 'tesseract.js';
import { ResultAsync, err, fromThrowable } from 'neverthrow';
import { getCompletions } from '$lib/hooks/completion';
import { spreadEntriesAcrossWeeks } from '$lib/parse/time_spread';
import type { WizardFileContext } from './wizard_file_context.svelte';
import { IncuriaError } from '$src/lib/errors';

function parseByFileType(context: WizardFileContext, scheduler: Scheduler) {
	return readFile(context.file).andThen((data) =>
		parseFile(context.file, context, scheduler, data)
	);
}

function readFile(file: File) {
	return ResultAsync.fromPromise(
		(async () => new Uint8Array(await file.arrayBuffer()))(),
		() => new IncuriaError(IncuriaErrorType.INVALID_FILE, 'Fehler beim Lesen der Datei')
	);
}

function parseFile(
	file: File,
	context: WizardFileContext,
	scheduler: Scheduler,
	data: Uint8Array<ArrayBuffer>
) {
	switch (file.type) {
		case 'application/pdf': {
			const pdfParser = new PDFParser(
				context,
				scheduler,
				(width, height) => {
					const canvas = new OffscreenCanvas(width, height);
					const context = canvas.getContext('2d')!;
					return { canvas, context };
				},
				incuriaStore.processPhotos
			);
			return ResultAsync.fromPromise(pdfParser.init(data), (e) =>
				IncuriaError.fromUnknown(
					e,
					'Fehler beim Initialisieren des PDF Parsers',
					IncuriaErrorType.PARSE_FAILED
				)
			).andThen(() =>
				ResultAsync.fromPromise(pdfParser.parse(), (e) =>
					IncuriaError.fromUnknown(e, 'Fehler beim Parsen des PDF', IncuriaErrorType.PARSE_FAILED)
				)
			);
		}
		case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
			const docxParser = new DOCXParser(context, scheduler, incuriaStore.processPhotos);
			return ResultAsync.fromPromise(docxParser.init(data), (e) =>
				IncuriaError.fromUnknown(
					e,
					'Fehler beim Initialisieren des DOCX Parsers',
					IncuriaErrorType.PARSE_FAILED
				)
			).andThen(() =>
				ResultAsync.fromPromise(docxParser.parse(), (e) =>
					IncuriaError.fromUnknown(e, 'Fehler beim Parsen des DOCX', IncuriaErrorType.PARSE_FAILED)
				)
			);
		}
		default:
			return err(new IncuriaError(IncuriaErrorType.INVALID_FILE, 'Dateityp nicht unterstützt.'));
	}
}

export function onFileDone(scheduler: WizardScheduler) {
	scheduler.filesReady += 1;
	if (scheduler.files !== null && scheduler.filesReady === scheduler.files.length) {
		scheduler.finish();
	} else {
		scheduler.schedule?.at(scheduler.filesReady + scheduler.batchSize)?.machine.run();
	}
}

export function createStateMachineForContext(
	context: WizardFileContext,
	scheduler: WizardScheduler
) {
	return fsm(WizardStep.INITIALISING, {
		[WizardStep.INITIALISING]: {
			run: WizardStep.PROCESSING
		},
		[WizardStep.PROCESSING]: {
			_enter() {
				if (context.cancelled) {
					this.cancel();
					return;
				}
				parseByFileType(context, scheduler.scheduler!).match(
					(value) => {
						context.snapshot = value.join('\n');
						this.next();
					},
					(error) => {
						context.error = error;
						this.error();
					}
				);
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
				getCompletions(context.snapshot as string).match(
					(value) => {
						context.snapshot = value;
						this.next();
					},
					(error) => {
						context.error = error;
						this.error();
					}
				);
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
				const throwableSpreadEntries = fromThrowable(
					() => spreadEntriesAcrossWeeks(context.snapshot as Entry[], context.dateRanges),
					(e) =>
						IncuriaError.fromUnknown(
							e,
							'Fehler beim Umformulieren der Einträge',
							IncuriaErrorType.SPREAD_FAILED
						)
				);
				throwableSpreadEntries().match(
					(value) => {
						context.snapshot = value;
						this.next();
					},
					(error) => {
						context.error = error;
						this.error();
					}
				);
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
				onFileDone(scheduler);
			},
			cancel: () => WizardStep.CANCELLED
		},
		[WizardStep.ERROR]: {
			_enter() {
				onFileDone(scheduler);
			}
		},
		[WizardStep.CANCELLED]: {
			_enter() {
				onFileDone(scheduler);
			}
		}
	});
}

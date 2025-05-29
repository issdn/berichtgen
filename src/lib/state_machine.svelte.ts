import { DOCXParser } from '$lib/parse/docx_parser';
import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
import { PDFParser } from '$lib/parse/pdf_parser';
import { FileTypes, IncuriaErrorType, WizardStep, type Entry, type ResultEntry } from '$lib/types';
import type { WizardScheduler } from '$lib/wizard_scheduler.svelte';
import fsm from 'svelte-fsm';
import type { Scheduler } from 'tesseract.js';
import { Err, ResultAsync, err, fromThrowable } from 'neverthrow';
import { getCompletions } from '$src/lib/completion/completion';
import { spreadEntriesAcrossWeeks } from '$lib/parse/time_spread';
import type { WizardFileContext } from './wizard_file_context.svelte';
import { IncuriaError } from '$src/lib/errors';
import { JSONParser } from '$src/lib/parse/json_parser';
import { TXTParser } from '$src/lib/parse/txt_parser';
import { IMGParser } from '$src/lib/parse/img_parser';

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
): ResultAsync<string | ResultEntry[] | never, IncuriaError> | Err<never, IncuriaError> {
	switch (file.type) {
		case FileTypes.PNG:
		case FileTypes.JPG: {
			const imgParser = new IMGParser(context, scheduler);
			return ResultAsync.fromPromise(imgParser.init(data), (e) =>
				IncuriaError.fromUnknown(
					e,
					'Fehler beim Initialisieren des Bild Parsers',
					IncuriaErrorType.PARSE_FAILED
				)
			).andThen(() =>
				ResultAsync.fromPromise(imgParser.parse(), (e) =>
					IncuriaError.fromUnknown(
						e,
						'Fehler beim Parsen des Bildes',
						IncuriaErrorType.PARSE_FAILED
					)
				)
			);
		}
		case FileTypes.TXT:
		case FileTypes.CSV: {
			const textParser = new TXTParser(context, scheduler);
			return ResultAsync.fromPromise(textParser.init(data), (e) =>
				IncuriaError.fromUnknown(
					e,
					'Fehler beim Initialisieren des JSON Parsers',
					IncuriaErrorType.PARSE_FAILED
				)
			).andThen(() => textParser.parse());
		}
		case FileTypes.JSON: {
			const jsonParser = new JSONParser(context, scheduler);
			return ResultAsync.fromPromise(jsonParser.init(data), (e) =>
				IncuriaError.fromUnknown(
					e,
					'Fehler beim Initialisieren des JSON Parsers',
					IncuriaErrorType.PARSE_FAILED
				)
			).andThen(() => (berichtgenStore.rewordJSON ? jsonParser.parse() : jsonParser.toSchema()));
		}
		case FileTypes.PDF: {
			const pdfParser = new PDFParser(
				context,
				scheduler,
				(width, height) => {
					const canvas = new OffscreenCanvas(width, height);
					const context = canvas.getContext('2d')!;
					return { canvas, context };
				},
				berichtgenStore.processPhotos
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
		case FileTypes.DOCX: {
			const docxParser = new DOCXParser(context, scheduler, berichtgenStore.processPhotos);
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
					(result) => {
						context.snapshot = result;
						this.next();
					},
					(error) => {
						context.error = error;
						this.error();
					}
				);
			},
			next: () => WizardStep.WAITING,
			error: () => WizardStep.ERROR,
			cancel: () => WizardStep.CANCELLED
		},
		[WizardStep.WAITING]: {
			_enter() {
				if (context.cancelled) {
					this.cancel();
					return;
				}
				if (context.dateRanges !== null) {
					this.run();
					return;
				}
			},
			run: () => (context.shouldSkip ? WizardStep.TIME_SPREADING : WizardStep.AI_COMPLETION),
			cancel: () => WizardStep.CANCELLED
		},
		[WizardStep.AI_COMPLETION]: {
			_enter() {
				if (context.cancelled) {
					this.cancel();
					return;
				}
				if (context.dateRanges === null) {
					this.wait();
					return;
				}
				getCompletions(context.snapshot as string, context.dateRanges.location).match(
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
			wait: () => WizardStep.WAITING,
			next: () => WizardStep.TIME_SPREADING,
			error: () => WizardStep.ERROR,
			cancel: () => WizardStep.CANCELLED
		},
		[WizardStep.TIME_SPREADING]: {
			_enter() {
				if (context.cancelled) {
					this.cancel();
					return;
				}
				const throwableSpreadEntries = fromThrowable(
					() => spreadEntriesAcrossWeeks(context.snapshot as Entry[], context.dateRanges!),
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
			cancel: () => WizardStep.CANCELLED
		},
		[WizardStep.DONE]: {
			_enter() {
				if (context.cancelled) {
					this.cancel();
					return;
				}
				context.finished = context.snapshot as ResultEntry[];
				onFileDone(scheduler);
			},
			cancel: () => WizardStep.CANCELLED
		},
		[WizardStep.ERROR]: {
			_enter() {
				scheduler.filesUnfinished += 1;
				onFileDone(scheduler);
			}
		},
		[WizardStep.CANCELLED]: {
			_enter() {
				scheduler.filesUnfinished += 1;
				onFileDone(scheduler);
			}
		}
	});
}

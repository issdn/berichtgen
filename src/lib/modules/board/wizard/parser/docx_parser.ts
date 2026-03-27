import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import type { ImageLike, Scheduler } from 'tesseract.js';
import { Parser } from './parser';
import type {
	DocxBodyNode,
	DocxCell,
	DocxDocument,
	DocxImage,
	DocxInline,
	DocxParagraph,
	DocxRow,
	DocxRun,
	DocxTable
} from '$core/parser/docx_ast';
import type { WizardFileContext } from '$wizard/services/wizard_file_context.svelte';
import { berichtgenStore } from '$lib/stores/berichtgen.svelte';
import { ***REMOVED***Error } from '$lib/errors';

export type DOCXFileData = {
	images: Map<string, Uint8Array<ArrayBufferLike>>;
	imgRels: Map<string, string>;
	textsOrRelIds: (string | [string])[];
	xml: Record<string, unknown>;
	/** Raw word/document.xml string, kept for the preserveOrder body-ordering pass. */
	xmlStr: string;
	/** Resolved run properties keyed by styleId (inheritance already applied). */
	styleRprs: Map<string, Record<string, unknown>>;
	/** Resolved paragraph properties keyed by styleId (inheritance already applied). */
	stylePprs: Map<string, Record<string, unknown>>;
	/** All header XML strings keyed by bare filename (e.g. "header1.xml"). */
	headerXmls: Map<string, string>;
	/** All footer XML strings keyed by bare filename. */
	footerXmls: Map<string, string>;
	/** Document-level relationships: rId → target bare filename. */
	docRels: Map<string, string>;
};

export class DOCXParser extends Parser {
	data: DOCXFileData | null = null;

	constructor(
		context: WizardFileContext,
		scheduler: Scheduler,
		withImages: boolean = berichtgenStore.processPhotos
	) {
		super(context, scheduler, withImages);
	}

	async init(data: Uint8Array) {
		const zip = new JSZip();
		const docx = await zip.loadAsync(data);
		const parser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: '@_',
			trimValues: false
		});

		const textsOrRelIds: (string | [string])[] = [];

		const [fileData, stylesData] = await Promise.all([
			docx.files['word/document.xml'].async('string'),
			this.parseStyles(docx, parser)
		]);
		const xml = parser.parse(fileData);
		this.findAllWT(xml, textsOrRelIds, this.withImages);

		// Always map images/rels so the AST preview can render inline images.
		const imagesAndRels = await this.mapImagesToRels(docx, parser);

		// Load all header/footer XML files and parse document rels.
		const hfNames = Object.keys(docx.files).filter((f) => !f.includes('_rels'));
		const hdrNames = hfNames.filter((f) => /header\d*\.xml$/.test(f));
		const ftrNames = hfNames.filter((f) => /footer\d*\.xml$/.test(f));
		const [hdrEntries, ftrEntries, rawRels] = await Promise.all([
			Promise.all(
				hdrNames.map(
					async (f): Promise<[string, string]> => [
						f.split('/').at(-1)!,
						await docx.files[f].async('string')
					]
				)
			),
			Promise.all(
				ftrNames.map(
					async (f): Promise<[string, string]> => [
						f.split('/').at(-1)!,
						await docx.files[f].async('string')
					]
				)
			),
			docx.files['word/_rels/document.xml.rels']?.async('string') ??
				Promise.resolve('')
		]);
		const headerXmls = new Map<string, string>(hdrEntries);
		const footerXmls = new Map<string, string>(ftrEntries);
		const parsedRels = parser.parse(rawRels ?? '');
		const docRels = new Map<string, string>();
		for (const rel of toArray(parsedRels?.Relationships?.Relationship)) {
			const r = rel as Record<string, string>;
			if (r['@_Id'] && r['@_Target'])
				docRels.set(r['@_Id'], r['@_Target'].split('/').at(-1)!);
		}

		this.data = {
			...imagesAndRels,
			textsOrRelIds,
			xml,
			xmlStr: fileData,
			headerXmls,
			footerXmls,
			docRels,
			...stylesData
		};

		if (this.withImages) {
			await this.createWorkerPool(this.data!.images.size);
		}
	}

	async parse() {
		if (this.data === null)
			throw new ***REMOVED***Error(
				'DEVELOPERS_FAULT',
				'FileWizard wurde nicht initialisiert.'
			);
		const result = [];
		for (let i = 0; i < this.data.textsOrRelIds.length; i += this.batchSize) {
			if (this.context.cancelled) break;
			result.push(
				...(await Promise.all(
					this.data.textsOrRelIds
						.slice(i, i + this.batchSize)
						.map(async (textOrId) =>
							this.parseChunk(textOrId)
						) as Promise<string>[]
				))
			);
		}
		this.freeWorkers();
		return result.join('\n');
	}

	parseAST(): DocxDocument {
		if (this.data === null)
			throw new ***REMOVED***Error(
				'DEVELOPERS_FAULT',
				'FileWizard wurde nicht initialisiert.'
			);

		const docBody =
			((this.data.xml['w:document'] as Record<string, unknown>)?.[
				'w:body'
			] as Record<string, unknown>) ?? {};

		// Re-parse with preserveOrder to recover the correct interleaving of
		// w:p and w:tbl siblings (the default parse groups same-named elements).
		// Note: orderedXml is an array that may start with the XML declaration
		// node, so we must find() the w:document entry rather than using [0].
		const orderedParser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: '@_',
			preserveOrder: true,
			trimValues: false
		});
		const orderedXml = orderedParser.parse(this.data.xmlStr) as Array<
			Record<string, unknown>
		>;
		const docEntry = orderedXml.find((e) => 'w:document' in e);
		const docEntries =
			(docEntry?.['w:document'] as Array<Record<string, unknown>>) ?? [];
		const bodyEntry = docEntries.find((e) => 'w:body' in e);
		const bodyChildren =
			(bodyEntry?.['w:body'] as Array<Record<string, unknown>>) ?? [];

		// Parallel lists from the non-ordered parse (used for actual content).
		const pList = toArray(docBody['w:p']) as Record<string, unknown>[];
		const tList = toArray(docBody['w:tbl']) as Record<string, unknown>[];
		let pIdx = 0,
			tIdx = 0;

		const fontsUsed = new Set<string>();
		const orderedNodes: DocxBodyNode[] = [];

		for (const child of bodyChildren) {
			const tag = Object.keys(child).find((k) => k !== ':@');
			if (tag === 'w:p' && pIdx < pList.length) {
				const rawP = pList[pIdx++];
				orderedNodes.push(this.mapParagraph(rawP, fontsUsed));
				// Explicit page break: w:br @w:type="page" inside any run.
				if (hasPageBreak(rawP)) orderedNodes.push({ type: 'page-break' });
			} else if (tag === 'w:tbl' && tIdx < tList.length) {
				orderedNodes.push(this.mapTable(tList[tIdx++], fontsUsed));
			}
		}

		// Page size and margins from w:sectPr (last child of w:body).
		const sectPr = docBody['w:sectPr'] as Record<string, unknown> | undefined;
		const pgSz = sectPr?.['w:pgSz'] as Record<string, unknown> | undefined;
		const pgMar = sectPr?.['w:pgMar'] as Record<string, unknown> | undefined;
		const pageWidth =
			pgSz?.['@_w:w'] !== undefined ? Number(pgSz['@_w:w']) / 20 : 612;
		const pageHeight =
			pgSz?.['@_w:h'] !== undefined ? Number(pgSz['@_w:h']) / 20 : 792;
		const headerDistance =
			pgMar?.['@_w:header'] !== undefined
				? Number(pgMar['@_w:header']) / 20
				: 35.4;
		const footerDistance =
			pgMar?.['@_w:footer'] !== undefined
				? Number(pgMar['@_w:footer']) / 20
				: 35.4;
		const pageMargins = {
			top:
				pgMar?.['@_w:top'] !== undefined ? Number(pgMar['@_w:top']) / 20 : 72,
			right:
				pgMar?.['@_w:right'] !== undefined
					? Number(pgMar['@_w:right']) / 20
					: 90,
			bottom:
				pgMar?.['@_w:bottom'] !== undefined
					? Number(pgMar['@_w:bottom']) / 20
					: 72,
			left:
				pgMar?.['@_w:left'] !== undefined ? Number(pgMar['@_w:left']) / 20 : 90
		};

		// Default font size from w:docDefaults rPr (half-points → pt).
		const defaultRpr = this.data.styleRprs.get('Normal') ?? {};
		const defaultFontSize =
			numVal(defaultRpr['w:sz']) != null ? numVal(defaultRpr['w:sz'])! / 2 : 11;

		// Resolve default header/footer via sectPr > w:headerReference / w:footerReference.
		const hfParser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: '@_',
			trimValues: false
		});
		const parseHF = (
			xmlStr: string | undefined,
			rootTag: string
		): DocxParagraph[] => {
			if (!xmlStr) return [];
			const root = hfParser.parse(xmlStr);
			const hf = root[rootTag] as Record<string, unknown> | undefined;
			if (!hf) return [];
			return toArray(hf['w:p']).map((p) =>
				this.mapParagraph(p as Record<string, unknown>, fontsUsed)
			);
		};
		const resolveHF = (
			refs: Record<string, string>[],
			xmlMap: Map<string, string>
		): string | undefined => {
			const defaultRef =
				refs.find((r) => r['@_w:type'] === 'default') ?? refs[0];
			const rId = defaultRef?.['@_r:id'];
			const file = rId ? this.data!.docRels.get(rId) : undefined;
			return file ? xmlMap.get(file) : undefined;
		};
		const hdrRefs = toArray(sectPr?.['w:headerReference']) as Record<
			string,
			string
		>[];
		const ftrRefs = toArray(sectPr?.['w:footerReference']) as Record<
			string,
			string
		>[];
		const header = parseHF(resolveHF(hdrRefs, this.data.headerXmls), 'w:hdr');
		const footer = parseHF(resolveHF(ftrRefs, this.data.footerXmls), 'w:ftr');

		return {
			body: orderedNodes,
			images: this.data.images as Map<string, Uint8Array>,
			imgRels: this.data.imgRels,
			pageWidth,
			pageHeight,
			pageMargins,
			headerDistance,
			footerDistance,
			defaultFontSize,
			fontsUsed,
			header: header.length ? header : undefined,
			footer: footer.length ? footer : undefined
		};
	}

	private mapParagraph(
		p: Record<string, unknown>,
		fontsUsed: Set<string> = new Set()
	): DocxParagraph {
		const pPr = p['w:pPr'] as Record<string, unknown> | undefined;
		const style = (pPr?.['w:pStyle'] as Record<string, string> | undefined)?.[
			'@_w:val'
		];

		// Style-level resolved props (with inheritance already applied).
		const styleRpr = this.data!.styleRprs.get(style ?? 'Normal') ?? {};
		const stylePpr = this.data!.stylePprs.get(style ?? 'Normal') ?? {};

		// Merge style pPr with explicit pPr (explicit wins).
		const effectivePpr: Record<string, unknown> = { ...stylePpr, ...pPr };

		// Alignment: explicit pPr overrides style.
		const alignment = (
			effectivePpr['w:jc'] as Record<string, string> | undefined
		)?.['@_w:val'];

		// Spacing (w:spacing attributes are directly on the element, not nested).
		const spacingNode = effectivePpr['w:spacing'] as
			| Record<string, unknown>
			| undefined;
		const spacingBefore =
			spacingNode?.['@_w:before'] !== undefined
				? Number(spacingNode['@_w:before']) / 20
				: undefined;
		const spacingAfter =
			spacingNode?.['@_w:after'] !== undefined
				? Number(spacingNode['@_w:after']) / 20
				: undefined;

		// Line spacing from w:spacing @w:line + @w:lineRule.
		let lineSpacing: DocxParagraph['lineSpacing'];
		if (spacingNode?.['@_w:line'] !== undefined) {
			const rawRule = spacingNode['@_w:lineRule'] as string | undefined;
			const rule: 'auto' | 'exact' | 'atLeast' =
				rawRule === 'exact'
					? 'exact'
					: rawRule === 'atLeast'
						? 'atLeast'
						: 'auto';
			lineSpacing = { value: Number(spacingNode['@_w:line']), rule };
		}

		// Left indent.
		const indentNode = effectivePpr['w:ind'] as
			| Record<string, unknown>
			| undefined;
		const indent =
			indentNode?.['@_w:left'] !== undefined
				? Number(indentNode['@_w:left']) / 20
				: undefined;

		let numPr: DocxParagraph['numPr'];
		const rawNumPr = pPr?.['w:numPr'] as Record<string, unknown> | undefined;
		if (rawNumPr) {
			const numId = String(
				(rawNumPr['w:numId'] as Record<string, unknown>)?.['@_w:val'] ?? '0'
			);
			const ilvl = Number(
				(rawNumPr['w:ilvl'] as Record<string, unknown>)?.['@_w:val'] ?? 0
			);
			numPr = { numId, ilvl };
		}

		const runs: DocxInline[] = [];
		for (const r of toArray(p['w:r'])) {
			const run = r as Record<string, unknown>;
			const rPr = run['w:rPr'] as Record<string, unknown> | undefined;

			// Check for image in run.
			const drawing = run['w:drawing'] as Record<string, unknown> | undefined;
			if (drawing) {
				const relId = findBlipEmbed(drawing);
				if (relId) {
					runs.push({ type: 'image', relId } satisfies DocxImage);
					continue;
				}
			}

			// Merge: style rPr provides defaults, run-explicit rPr overrides.
			const effectiveRpr: Record<string, unknown> = { ...styleRpr, ...rPr };

			const rawText = run['w:t'];
			const text =
				typeof rawText === 'string'
					? rawText
					: typeof rawText === 'object' && rawText !== null
						? String((rawText as Record<string, unknown>)['#text'] ?? '')
						: '';

			const fontFamily = (
				effectiveRpr['w:rFonts'] as Record<string, string> | undefined
			)?.['@_w:ascii'];
			if (fontFamily) fontsUsed.add(fontFamily);

			runs.push({
				type: 'run',
				text,
				bold: hasProp(effectiveRpr, 'w:b'),
				italic: hasProp(effectiveRpr, 'w:i'),
				underline: hasProp(effectiveRpr, 'w:u'),
				color: (
					effectiveRpr['w:color'] as Record<string, string> | undefined
				)?.['@_w:val'],
				size: numVal(effectiveRpr['w:sz']),
				fontFamily: fontFamily || undefined
			} satisfies DocxRun);
		}

		return {
			type: 'paragraph',
			style,
			alignment,
			numPr,
			spacingBefore,
			spacingAfter,
			indent,
			lineSpacing,
			runs
		};
	}

	private mapTable(
		t: Record<string, unknown>,
		fontsUsed: Set<string> = new Set()
	): DocxTable {
		// Table-level default cell margins from w:tblPr > w:tblCellMar (twips → pt).
		const tblPr = t['w:tblPr'] as Record<string, unknown> | undefined;
		const defaultCellMar = parseCellMar(
			tblPr?.['w:tblCellMar'] as Record<string, unknown> | undefined
		);

		// Column widths from w:tblGrid > w:gridCol @w:w (twips → pt).
		const tblGrid = t['w:tblGrid'] as Record<string, unknown> | undefined;
		const colWidths = tblGrid
			? toArray(tblGrid['w:gridCol']).map(
					(col) => Number((col as Record<string, unknown>)['@_w:w'] ?? 0) / 20
				)
			: undefined;

		const rows: DocxRow[] = [];
		for (const tr of toArray(t['w:tr'])) {
			const trNode = tr as Record<string, unknown>;
			const trPr = trNode['w:trPr'] as Record<string, unknown> | undefined;

			// Row height from w:trPr > w:trHeight @w:val (twips → pt).
			const trHeight = trPr?.['w:trHeight'] as
				| Record<string, unknown>
				| undefined;
			const height =
				trHeight?.['@_w:val'] !== undefined
					? Number(trHeight['@_w:val']) / 20
					: undefined;

			// Row shading from w:trPr > w:shd @w:fill.
			const trShd = trPr?.['w:shd'] as Record<string, unknown> | undefined;
			const rowBg = shdFill(trShd);

			const cells: DocxCell[] = [];
			for (const tc of toArray(trNode['w:tc'])) {
				const tcNode = tc as Record<string, unknown>;
				const tcPr = tcNode['w:tcPr'] as Record<string, unknown> | undefined;
				const colspan = numVal(
					tcPr?.['w:gridSpan'] as Record<string, unknown> | undefined
				);
				const vMerge = tcPr?.['w:vMerge'] as
					| Record<string, unknown>
					| undefined;
				const rowspan = vMerge !== undefined ? 1 : undefined;

				// Cell shading from w:tcPr > w:shd @w:fill (overrides row shading).
				const tcShd = tcPr?.['w:shd'] as Record<string, unknown> | undefined;
				const cellBg = shdFill(tcShd) ?? rowBg;

				// Cell padding: cell-level w:tcMar overrides table default.
				const cellMar = parseCellMar(
					tcPr?.['w:tcMar'] as Record<string, unknown> | undefined,
					defaultCellMar
				);

				// Vertical alignment from w:tcPr > w:vAlign @w:val.
				const vAlignRaw = (
					tcPr?.['w:vAlign'] as Record<string, unknown> | undefined
				)?.['@_w:val'];
				const vAlign =
					vAlignRaw === 'center'
						? 'center'
						: vAlignRaw === 'bottom'
							? 'bottom'
							: vAlignRaw === 'top'
								? 'top'
								: undefined;

				const paragraphs = toArray(tcNode['w:p']).map((p) =>
					this.mapParagraph(p as Record<string, unknown>, fontsUsed)
				);
				cells.push({
					paragraphs,
					colspan: colspan && colspan > 1 ? colspan : undefined,
					rowspan,
					bgColor: cellBg,
					padding: cellMar,
					vAlign
				} satisfies DocxCell);
			}
			rows.push({ cells, height, bgColor: rowBg });
		}
		const tableWidth = colWidths?.reduce((sum, w) => sum + w, 0);
		return { type: 'table', rows, colWidths, tableWidth };
	}

	private async parseChunk(textOrId: string | [string]) {
		if (Array.isArray(textOrId)) {
			const rel = this.data!.imgRels.get(textOrId[0]);
			if (rel === undefined) {
				return '';
			}

			const fileData = this.data!.images.get(rel);
			if (fileData === undefined) {
				return '';
			}

			if (this.withImages) {
				const result = await this.scheduler!.addJob(
					'recognize',
					fileData as ImageLike
				);
				return result.data.text;
			}
		} else {
			return textOrId;
		}
	}

	private async findAllWT(
		obj: Record<string, unknown>,
		results: (string | [string])[] = [],
		withImages: boolean
	) {
		if (typeof obj === 'object') {
			for (const key in obj) {
				if (key === 'w:t') {
					const text = obj[key] as string;
					if (text.length > 3) results.push(text);
				} else if (key === 'a:blip' && withImages) {
					results.push([(obj[key] as Record<string, string>)['@_r:embed']]);
				} else {
					this.findAllWT(
						obj[key] as Record<string, unknown>,
						results,
						withImages
					);
				}
			}
		}
		return results;
	}

	private async parseStyles(
		docx: JSZip,
		parser: XMLParser
	): Promise<{
		styleRprs: Map<string, Record<string, unknown>>;
		stylePprs: Map<string, Record<string, unknown>>;
	}> {
		const stylesFile = docx.files['word/styles.xml'];
		if (!stylesFile) return { styleRprs: new Map(), stylePprs: new Map() };

		const fileData = await stylesFile.async('string');
		const xml = parser.parse(fileData) as Record<string, unknown>;
		const stylesRoot = xml['w:styles'] as Record<string, unknown> | undefined;
		if (!stylesRoot) return { styleRprs: new Map(), stylePprs: new Map() };

		// Document-level defaults used as the base of all inheritance chains.
		const docDefaults = stylesRoot['w:docDefaults'] as
			| Record<string, unknown>
			| undefined;
		const defaultRpr = ((
			docDefaults?.['w:rPrDefault'] as Record<string, unknown>
		)?.['w:rPr'] ?? {}) as Record<string, unknown>;
		const defaultPpr = ((
			docDefaults?.['w:pPrDefault'] as Record<string, unknown>
		)?.['w:pPr'] ?? {}) as Record<string, unknown>;

		type RawStyle = {
			rPr: Record<string, unknown>;
			pPr: Record<string, unknown>;
			basedOn?: string;
		};
		const rawStyles = new Map<string, RawStyle>();

		for (const style of toArray(stylesRoot['w:style'])) {
			const s = style as Record<string, unknown>;
			const styleId = s['@_w:styleId'] as string | undefined;
			if (!styleId) continue;
			rawStyles.set(styleId, {
				rPr: (s['w:rPr'] as Record<string, unknown>) ?? {},
				pPr: (s['w:pPr'] as Record<string, unknown>) ?? {},
				basedOn: (s['w:basedOn'] as Record<string, string> | undefined)?.[
					'@_w:val'
				]
			});
		}

		// Memoised recursive resolvers that walk the basedOn chain.
		const resolvedRprs = new Map<string, Record<string, unknown>>();
		const resolvedPprs = new Map<string, Record<string, unknown>>();

		const resolveRpr = (
			styleId: string,
			stack = new Set<string>()
		): Record<string, unknown> => {
			if (resolvedRprs.has(styleId)) return resolvedRprs.get(styleId)!;
			if (stack.has(styleId)) return {};
			stack.add(styleId);
			const s = rawStyles.get(styleId);
			if (!s) return defaultRpr;
			const parent = s.basedOn ? resolveRpr(s.basedOn, stack) : defaultRpr;
			const resolved = { ...parent, ...s.rPr };
			resolvedRprs.set(styleId, resolved);
			return resolved;
		};

		const resolvePpr = (
			styleId: string,
			stack = new Set<string>()
		): Record<string, unknown> => {
			if (resolvedPprs.has(styleId)) return resolvedPprs.get(styleId)!;
			if (stack.has(styleId)) return {};
			stack.add(styleId);
			const s = rawStyles.get(styleId);
			if (!s) return defaultPpr;
			const parent = s.basedOn ? resolvePpr(s.basedOn, stack) : defaultPpr;
			const resolved = { ...parent, ...s.pPr };
			resolvedPprs.set(styleId, resolved);
			return resolved;
		};

		for (const styleId of rawStyles.keys()) {
			resolveRpr(styleId);
			resolvePpr(styleId);
		}

		return { styleRprs: resolvedRprs, stylePprs: resolvedPprs };
	}

	private async mapImagesToRels(docx: JSZip, parser: XMLParser) {
		const images: Map<string, Uint8Array> = new Map();
		const imgRels: Map<string, string> = new Map();

		const mediaFiles = Object.keys(docx.files).filter(
			(fileName) =>
				fileName.startsWith('word/media/') || fileName.startsWith('media/')
		);

		const relsFiles = Object.keys(docx.files).filter(
			(fileName) =>
				fileName.startsWith('word/_rels/document.xml.rels') ||
				fileName.startsWith('_rels/document.xml.rels')
		);

		await Promise.all(
			mediaFiles.map(async (fileName) => {
				const fileData = await docx.files[fileName].async('uint8array');
				images.set(fileName.split('/').at(-1)!, fileData);
			})
		);

		await Promise.all(
			relsFiles.map(async (fileName) => {
				const fileData = await docx.files[fileName].async('string');
				const xml = parser.parse(fileData);

				for (const rel of xml.Relationships.Relationship) {
					if (
						rel['@_Target'].startsWith('media/image') ||
						rel['@_Target'].startsWith('/media/image')
					) {
						imgRels.set(rel['@_Id'], rel['@_Target'].split('/').at(-1)!);
					}
				}
			})
		);

		return { images, imgRels };
	}
}

// --- helpers ---

function hasPageBreak(p: Record<string, unknown>): boolean {
	// Also detect w:pageBreakBefore on the paragraph itself.
	const pPr = p['w:pPr'] as Record<string, unknown> | undefined;
	if (pPr && 'w:pageBreakBefore' in pPr) return true;
	return toArray(p['w:r']).some((r) => {
		const run = r as Record<string, unknown>;
		// Explicit w:br type="page"
		const brs = toArray(run['w:br']);
		if (
			brs.some((br) => (br as Record<string, unknown>)['@_w:type'] === 'page')
		)
			return true;
		// Word rendered page-break hint stored in the file
		return 'w:lastRenderedPageBreak' in run;
	});
}

function toArray<T>(val: T | T[] | undefined | null): T[] {
	if (val === undefined || val === null) return [];
	return Array.isArray(val) ? val : [val];
}

function hasProp(obj: unknown, key: string): boolean {
	return obj !== null && typeof obj === 'object' && key in obj;
}

function numVal(obj: unknown): number | undefined {
	if (obj === null || typeof obj !== 'object') return undefined;
	const v = (obj as Record<string, unknown>)['@_w:val'];
	return v !== undefined ? Number(v) : undefined;
}

type CellPadding = { top: number; right: number; bottom: number; left: number };

/** Parses a w:tcMar or w:tblCellMar node into pt values (twips ÷ 20). */
function parseCellMar(
	mar: Record<string, unknown> | undefined,
	fallback: CellPadding = { top: 0, right: 0, bottom: 0, left: 0 }
): CellPadding {
	if (!mar) return fallback;
	const edge = (key: string, def: number) => {
		const node = mar[key] as Record<string, unknown> | undefined;
		return node?.['@_w:w'] !== undefined ? Number(node['@_w:w']) / 20 : def;
	};
	return {
		top: edge('w:top', fallback.top),
		right: edge('w:right', fallback.right),
		bottom: edge('w:bottom', fallback.bottom),
		left: edge('w:left', fallback.left)
	};
}

/** Extracts @w:fill from a w:shd node; returns undefined for 'auto' / missing. */
function shdFill(shd: Record<string, unknown> | undefined): string | undefined {
	if (!shd) return undefined;
	const fill = shd['@_w:fill'] as string | undefined;
	return fill && fill !== 'auto' ? fill : undefined;
}

function findBlipEmbed(drawing: Record<string, unknown>): string | undefined {
	if (typeof drawing !== 'object' || drawing === null) return undefined;
	for (const key of Object.keys(drawing)) {
		if (key === 'a:blip') {
			return (drawing[key] as Record<string, string>)['@_r:embed'];
		}
		const nested = findBlipEmbed(drawing[key] as Record<string, unknown>);
		if (nested) return nested;
	}
	return undefined;
}

export type DocxBodyNode = DocxPageBreak | DocxParagraph | DocxTable;

export type DocxCell = {
	/** Cell background fill hex from w:tcPr > w:shd @w:fill. */
	bgColor?: string;
	colspan?: number;
	/** Cell padding in pt from w:tcMar (falls back to table-level w:tblCellMar). */
	padding: { bottom: number; left: number; right: number; top: number; };
	paragraphs: DocxParagraph[];
	rowspan?: number;
	/** Vertical alignment from w:tcPr > w:vAlign @w:val ('top' | 'center' | 'bottom'). */
	vAlign?: 'bottom' | 'center' | 'top';
};

export type DocxDocument = {
	body: DocxBodyNode[];
	/** Default font size in pt from w:docDefaults (÷ 2 from half-points). */
	defaultFontSize: number;
	/** All font names referenced in the document (for dynamic web-font loading). */
	fontsUsed: Set<string>;
	/** Paragraphs from the first default footer (word/footer*.xml), if present. */
	footer?: DocxParagraph[];
	/** Distance from bottom edge to footer in pt (from w:pgMar @w:footer ÷ 20). Default: 35.4pt. */
	footerDistance: number;
	/** Paragraphs from the first default header (word/header*.xml), if present. */
	header?: DocxParagraph[];
	/** Distance from top edge to header in pt (from w:pgMar @w:header ÷ 20). Default: 35.4pt. */
	headerDistance: number;
	images: Map<string, Uint8Array>;
	imgRels: Map<string, string>;
	/** Full page height in pt (from w:pgSz @w:h ÷ 20). Default: 792pt (Letter). */
	pageHeight: number;
	/** Page margins in pt (from w:pgMar ÷ 20). */
	pageMargins: { bottom: number; left: number; right: number; top: number; };
	/** Full page width in pt (from w:pgSz @w:w ÷ 20). Default: 612pt (Letter). */
	pageWidth: number;
};

export type DocxImage = {
	relId: string;
	type: 'image';
};

export type DocxInline = DocxImage | DocxRun;

export type DocxPageBreak = { type: 'page-break' };

export type DocxParagraph = {
	alignment?: string;
	/** Left indent in pt (from w:ind @w:left ÷ 20). */
	indent?: number;
	/**
	 * Line spacing from w:spacing @w:line / @w:lineRule.
	 * rule='auto'  → value is in 240ths of a line (240=1x, 360=1.5x, 480=2x).
	 * rule='exact' → value is in twips (absolute height).
	 * rule='atLeast' → minimum line height in twips.
	 */
	lineSpacing?: { rule: 'atLeast' | 'auto' | 'exact'; value: number; };
	numPr?: { ilvl: number; numId: string; };
	runs: DocxInline[];
	/** Spacing below the paragraph in pt (from w:spacing @w:after ÷ 20). */
	spacingAfter?: number;
	/** Spacing above the paragraph in pt (from w:spacing @w:before ÷ 20). */
	spacingBefore?: number;
	style?: string;
	type: 'paragraph';
};

export type DocxRow = {
	/** Row background fill hex (e.g. "4F81BD") from w:trPr > w:shd @w:fill. */
	bgColor?: string;
	cells: DocxCell[];
	/** Row height in pt from w:trPr > w:trHeight @w:val ÷ 20. */
	height?: number;
};

export type DocxRun = {
	bold?: boolean;
	color?: string;
	/** ASCII font name from w:rFonts @w:ascii. */
	fontFamily?: string;
	italic?: boolean;
	/** Half-points (÷ 2 = pt). */
	size?: number;
	text: string;
	type: 'run';
	underline?: boolean;
};

export type DocxTable = {
	/** Column widths in pt from w:tblGrid (÷ 20). */
	colWidths?: number[];
	rows: DocxRow[];
	/** Total table width in pt (sum of colWidths). Used instead of 100%. */
	tableWidth?: number;
	type: 'table';
};

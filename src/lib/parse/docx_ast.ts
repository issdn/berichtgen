export type DocxDocument = {
	body: DocxBodyNode[];
	images: Map<string, Uint8Array>;
	imgRels: Map<string, string>;
	/** Full page width in pt (from w:pgSz @w:w ÷ 20). Default: 612pt (Letter). */
	pageWidth: number;
	/** Full page height in pt (from w:pgSz @w:h ÷ 20). Default: 792pt (Letter). */
	pageHeight: number;
	/** Page margins in pt (from w:pgMar ÷ 20). */
	pageMargins: { top: number; right: number; bottom: number; left: number };
	/** Distance from top edge to header in pt (from w:pgMar @w:header ÷ 20). Default: 35.4pt. */
	headerDistance: number;
	/** Distance from bottom edge to footer in pt (from w:pgMar @w:footer ÷ 20). Default: 35.4pt. */
	footerDistance: number;
	/** Default font size in pt from w:docDefaults (÷ 2 from half-points). */
	defaultFontSize: number;
	/** All font names referenced in the document (for dynamic web-font loading). */
	fontsUsed: Set<string>;
	/** Paragraphs from the first default header (word/header*.xml), if present. */
	header?: DocxParagraph[];
	/** Paragraphs from the first default footer (word/footer*.xml), if present. */
	footer?: DocxParagraph[];
};

export type DocxBodyNode = DocxParagraph | DocxTable | DocxPageBreak;

export type DocxPageBreak = { type: 'page-break' };

export type DocxParagraph = {
	type: 'paragraph';
	style?: string;
	alignment?: string;
	numPr?: { numId: string; ilvl: number };
	/** Spacing above the paragraph in pt (from w:spacing @w:before ÷ 20). */
	spacingBefore?: number;
	/** Spacing below the paragraph in pt (from w:spacing @w:after ÷ 20). */
	spacingAfter?: number;
	/** Left indent in pt (from w:ind @w:left ÷ 20). */
	indent?: number;
	/**
	 * Line spacing from w:spacing @w:line / @w:lineRule.
	 * rule='auto'  → value is in 240ths of a line (240=1x, 360=1.5x, 480=2x).
	 * rule='exact' → value is in twips (absolute height).
	 * rule='atLeast' → minimum line height in twips.
	 */
	lineSpacing?: { value: number; rule: 'auto' | 'exact' | 'atLeast' };
	runs: DocxInline[];
};

export type DocxInline = DocxRun | DocxImage;

export type DocxRun = {
	type: 'run';
	text: string;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	color?: string;
	/** Half-points (÷ 2 = pt). */
	size?: number;
	/** ASCII font name from w:rFonts @w:ascii. */
	fontFamily?: string;
};

export type DocxImage = {
	type: 'image';
	relId: string;
};

export type DocxTable = {
	type: 'table';
	rows: DocxRow[];
	/** Column widths in pt from w:tblGrid (÷ 20). */
	colWidths?: number[];
	/** Total table width in pt (sum of colWidths). Used instead of 100%. */
	tableWidth?: number;
};

export type DocxRow = {
	cells: DocxCell[];
	/** Row height in pt from w:trPr > w:trHeight @w:val ÷ 20. */
	height?: number;
	/** Row background fill hex (e.g. "4F81BD") from w:trPr > w:shd @w:fill. */
	bgColor?: string;
};

export type DocxCell = {
	paragraphs: DocxParagraph[];
	colspan?: number;
	rowspan?: number;
	/** Cell background fill hex from w:tcPr > w:shd @w:fill. */
	bgColor?: string;
	/** Cell padding in pt from w:tcMar (falls back to table-level w:tblCellMar). */
	padding: { top: number; right: number; bottom: number; left: number };
	/** Vertical alignment from w:tcPr > w:vAlign @w:val ('top' | 'center' | 'bottom'). */
	vAlign?: 'top' | 'center' | 'bottom';
};

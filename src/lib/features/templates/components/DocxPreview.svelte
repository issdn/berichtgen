<script lang="ts">
	import { DOCXParser } from '$lib/features/parser/docx_parser';
	import type {
		DocxDocument,
		DocxInline,
		DocxParagraph
	} from '$lib/features/parser/docx_ast';
	import { untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';

	const { fileUrl }: { fileUrl: string } = $props();

	// Explicitly capture the initial prop value before the first await.
	// fileUrl won't change while the dialog is open, so untrack() is intentional.
	const url = untrack(() => fileUrl);

	// Async component — suspends until the document is parsed.
	const res = await fetch(url);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const bytes = new Uint8Array(await res.arrayBuffer());

	const parser = new DOCXParser(
		{ cancelled: false } as never,
		null as never,
		false
	);
	await parser.init(bytes);
	const doc: DocxDocument = parser.parseAST();

	/** Object-URL map built from embedded images. */
	const imageUrls = new SvelteMap<string, string>();
	for (const [filename, imgBytes] of doc.images) {
		imageUrls.set(
			filename,
			URL.createObjectURL(new Blob([imgBytes as Uint8Array<ArrayBuffer>]))
		);
	}

	/** Revoke all object URLs when the component is destroyed. */
	$effect(() => () => {
		for (const url of imageUrls.values()) URL.revokeObjectURL(url);
	});

	/**
	 * Split body nodes into pages at each page-break node.
	 * Header/footer are rendered above/below each page slice.
	 */
	const pages = (() => {
		const result: (typeof doc.body)[] = [];
		let cur: typeof doc.body = [];
		for (const node of doc.body) {
			if (node.type === 'page-break') {
				result.push(cur);
				cur = [];
			} else {
				cur.push(node);
			}
		}
		result.push(cur);
		return result;
	})();

	/**
	 * Page sheet style: full page width with Word margins as padding.
	 * Sizes come from w:pgSz / w:pgMar so the preview matches Word 1:1.
	 * Default font size comes from w:docDefaults so body text renders at the
	 * correct pt size rather than the browser default (16px).
	 */
	const pageStyle = [
		`width:${doc.pageWidth}pt`,
		`min-height:${doc.pageHeight}pt`,
		`padding:${doc.pageMargins.top}pt ${doc.pageMargins.right}pt ${doc.pageMargins.bottom}pt ${doc.pageMargins.left}pt`,
		`font-size:${doc.defaultFontSize}pt`,
		'color:#000000',
		'background:#ffffff',
		'box-sizing:border-box'
	].join(';');

	/** Resolves a relationship ID to a pre-built object URL. */
	function resolveImage(relId: string): string | undefined {
		const filename = doc.imgRels.get(relId);
		return filename ? imageUrls.get(filename) : undefined;
	}

	/** Maps a DOCX paragraph style name to an HTML heading tag. */
	function headingTag(style: string | undefined): string {
		if (!style) return 'p';
		const match = style.match(/^[Hh]eading(\d)/);
		if (match) return `h${match[1]}`;
		return 'p';
	}

	/**
	 * Structural classes for headings — no font-size here, that comes from
	 * runStyle() via the resolved Word styles so sizes match the document exactly.
	 */
	function headingClass(tag: string): string {
		switch (tag) {
			case 'h1':
				return 'mb-2 mt-4 font-bold';
			case 'h2':
				return 'mb-2 mt-3 font-bold';
			case 'h3':
				return 'mb-1 mt-3 font-semibold';
			case 'h4':
				return 'mb-1 mt-2 font-semibold';
			default:
				return '';
		}
	}

	/**
	 * Builds an inline CSS style string from paragraph-level properties.
	 * Spacing and indent come from styles.xml (resolved with inheritance).
	 * Headings also get font-size:inherit to suppress browser h1–h6 defaults.
	 */
	function paragraphStyle(node: DocxParagraph, isHeading = false): string {
		const parts: string[] = [];
		if (isHeading) parts.push('font-size:inherit');
		if (node.alignment)
			parts.push(
				`text-align:${node.alignment === 'both' ? 'justify' : node.alignment}`
			);
		if (node.spacingBefore != null)
			parts.push(`margin-top:${node.spacingBefore}pt`);
		if (node.spacingAfter != null)
			parts.push(`margin-bottom:${node.spacingAfter}pt`);
		if (node.indent != null) parts.push(`padding-left:${node.indent}pt`);
		if (node.lineSpacing) {
			if (node.lineSpacing.rule === 'auto') {
				// 240 = single spacing → line-height: 1
				parts.push(`line-height:${node.lineSpacing.value / 240}`);
			} else {
				// 'exact' or 'atLeast': absolute value in twips → pt
				parts.push(`line-height:${node.lineSpacing.value / 20}pt`);
			}
		}
		return parts.join(';');
	}

	/** Converts a DocxRun's formatting properties to a CSS inline style string. */
	function runStyle(run: {
		bold?: boolean;
		italic?: boolean;
		underline?: boolean;
		color?: string;
		size?: number;
		fontFamily?: string;
	}): string {
		const parts: string[] = [];
		if (run.fontFamily)
			parts.push(`font-family:'${run.fontFamily}',sans-serif`);
		if (run.bold) parts.push('font-weight:bold');
		if (run.italic) parts.push('font-style:italic');
		if (run.underline) parts.push('text-decoration:underline');
		if (run.color && run.color !== 'auto') parts.push(`color:#${run.color}`);
		if (run.size) parts.push(`font-size:${run.size / 2}pt`);
		parts.push('vertical-align:middle');
		return parts.join(';');
	}
</script>

{#snippet inlines(items: DocxInline[])}
	{#each items as inline, i (i)}
		{#if inline.type === 'run'}
			<span style={runStyle(inline)}>{inline.text}</span>
		{:else if inline.type === 'image'}
			{@const src = resolveImage(inline.relId)}
			{#if src}<img {src} alt="" class="inline-block max-w-full" />{/if}
		{/if}
	{/each}
{/snippet}

{#snippet para(node: DocxParagraph)}
	{@const tag = headingTag(node.style)}
	{#if tag === 'p'}
		<p
			class="docx-p min-h-[1em] {node.numPr ? 'ml-6 list-disc' : ''}"
			style={paragraphStyle(node)}
		>
			{@render inlines(node.runs)}
		</p>
	{:else}
		<svelte:element
			this={tag}
			class="docx-heading {headingClass(tag)}"
			style={paragraphStyle(node, true)}
		>
			{@render inlines(node.runs)}
		</svelte:element>
	{/if}
{/snippet}

<div class="flex flex-col items-center gap-6">
	{#each pages as page, pi (pi)}
		<div class="docx-preview relative shadow-md" style={pageStyle}>
			{#if doc.header?.length}
				<div
					class="absolute"
					style="top:{doc.headerDistance}pt;left:{doc.pageMargins
						.left}pt;right:{doc.pageMargins.right}pt"
				>
					{#each doc.header as node, i (i)}
						{@render para(node)}
					{/each}
				</div>
			{/if}

			{#each page as node, ni (ni)}
				{#if node.type === 'paragraph'}
					{@render para(node)}
				{:else if node.type === 'table'}
					<table
						class="border-collapse text-sm"
						style="width:{node.tableWidth
							? `${node.tableWidth}pt`
							: '100%'};table-layout:fixed"
					>
						{#if node.colWidths}
							<colgroup>
								{#each node.colWidths as w, ci (ci)}
									<col style="width:{w}pt" />
								{/each}
							</colgroup>
						{/if}
						<tbody>
							{#each node.rows as row, ri (ri)}
								<tr
									style="{row.height
										? `height:${row.height}pt;`
										: ''}{row.bgColor ? `background:#${row.bgColor}` : ''}"
								>
									{#each row.cells as cell, ci (ci)}
										<td
											class="border border-gray-300"
											style="word-break:break-word;overflow-wrap:break-word;padding:{cell
												.padding.top}pt {cell.padding.right}pt {cell.padding
												.bottom}pt {cell.padding
												.left}pt;vertical-align:{cell.vAlign === 'center'
												? 'middle'
												: (cell.vAlign ?? 'top')};{cell.bgColor
												? `background:#${cell.bgColor}`
												: ''}"
											colspan={cell.colspan}
											rowspan={cell.rowspan}
										>
											{#each cell.paragraphs as cp, cpi (cpi)}
												<p class="min-h-[1em]" style={paragraphStyle(cp)}>
													{@render inlines(cp.runs)}
												</p>
											{/each}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			{/each}

			{#if doc.footer?.length}
				<div
					class="absolute"
					style="bottom:{doc.footerDistance}pt;left:{doc.pageMargins
						.left}pt;right:{doc.pageMargins.right}pt"
				>
					{#each doc.footer as node, i (i)}
						{@render para(node)}
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>

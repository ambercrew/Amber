/**
 * Reading splits are bounded by a top-level-block budget, not by page, chapter,
 * or outline structure — those break unpredictably (mid-paragraph after PDF
 * reflow) or are unbounded (a chapter can exceed the whole editor budget).
 * Preferring a heading boundary near the target keeps most seams at a place a
 * reader already expects a break; the block ceiling bounds worst-case editor
 * size deterministically, and a break is never inserted inside a block.
 */
const MAX_BLOCKS = 250;
const HEADING_LOOKAHEAD = 80;
const TARGET_BLOCKS = MAX_BLOCKS - HEADING_LOOKAHEAD;
const HEADING_TAGS = new Set(["H1", "H2", "H3"]);

/** Splits normalized HTML into per-split HTML strings along top-level block boundaries. */
export function splitContent(html: string): string[] {
	const doc = new DOMParser().parseFromString(html, "text/html");
	const blocks = Array.from(doc.body.children);
	if (blocks.length === 0) return [html];

	const splits: string[] = [];
	let start = 0;
	while (start < blocks.length) {
		const end = findSplitEnd(blocks, start);
		splits.push(
			blocks
				.slice(start, end)
				.map(block => block.outerHTML)
				.join(""),
		);
		start = end;
	}
	return splits;
}

function findSplitEnd(blocks: Element[], start: number): number {
	const total = blocks.length;
	const windowStart = start + TARGET_BLOCKS;
	if (windowStart >= total) return total;

	const windowEnd = Math.min(windowStart + HEADING_LOOKAHEAD, total);
	for (let i = windowStart; i < windowEnd; i++) {
		if (HEADING_TAGS.has(blocks[i].tagName.toUpperCase())) return i;
	}

	const hardCap = start + MAX_BLOCKS;
	return hardCap < total ? hardCap : total;
}

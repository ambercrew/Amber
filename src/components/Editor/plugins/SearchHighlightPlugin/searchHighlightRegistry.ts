export const ALL_HIGHLIGHT_NAME = "amber-find-all";
export const CURRENT_HIGHLIGHT_NAME = "amber-find-current";

/**
 * Thin wrapper around the CSS Custom Highlight API, aggregating ranges from
 * every mounted editor into two shared highlight names ("all matches",
 * "current match"). A module singleton since `CSS.highlights` is itself a
 * global registry.
 */
class SearchHighlightRegistry {
	private readonly allRanges = new Map<string, Range[]>();
	private currentRange: Range | null = null;

	/** The ranges last reported by a given editor, for scrolling to an exact match. */
	getRanges(editorKey: string): Range[] | undefined {
		return this.allRanges.get(editorKey);
	}

	setAll(editorKey: string, ranges: Range[]): void {
		this.allRanges.set(editorKey, ranges);
		this.applyAll();
	}

	clear(editorKey: string): void {
		this.allRanges.delete(editorKey);
		this.applyAll();
	}

	setCurrent(range: Range | null): void {
		this.currentRange = range;
		this.applyCurrent();
	}

	clearAll(): void {
		this.allRanges.clear();
		this.currentRange = null;
		this.applyAll();
		this.applyCurrent();
	}

	private applyAll(): void {
		const ranges = Array.from(this.allRanges.values()).flat();
		if (ranges.length === 0) {
			CSS.highlights.delete(ALL_HIGHLIGHT_NAME);
			return;
		}
		CSS.highlights.set(ALL_HIGHLIGHT_NAME, new Highlight(...ranges));
	}

	private applyCurrent(): void {
		if (!this.currentRange) {
			CSS.highlights.delete(CURRENT_HIGHLIGHT_NAME);
			return;
		}
		CSS.highlights.set(
			CURRENT_HIGHLIGHT_NAME,
			new Highlight(this.currentRange),
		);
	}
}

export const searchHighlightRegistry = new SearchHighlightRegistry();

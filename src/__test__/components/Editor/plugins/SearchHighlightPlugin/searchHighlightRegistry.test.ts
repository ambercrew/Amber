import {
	ALL_HIGHLIGHT_NAME,
	CURRENT_HIGHLIGHT_NAME,
	searchHighlightRegistry,
} from "../../../../../components/Editor/plugins/SearchHighlightPlugin/searchHighlightRegistry";

// jsdom doesn't implement the CSS Custom Highlight API, so it's polyfilled
// here with a real Map-backed stand-in that records what was set.
class FakeHighlight {
	ranges: Range[];
	constructor(...ranges: Range[]) {
		this.ranges = ranges;
	}
}

function makeRange(): Range {
	return {} as Range;
}

beforeEach(() => {
	(globalThis as unknown as { Highlight: typeof FakeHighlight }).Highlight =
		FakeHighlight;
	Object.defineProperty(globalThis.CSS, "highlights", {
		configurable: true,
		value: new Map<string, FakeHighlight>(),
	});
	searchHighlightRegistry.clearAll();
});

function highlights(): Map<string, FakeHighlight> {
	return CSS.highlights as unknown as Map<string, FakeHighlight>;
}

describe("searchHighlightRegistry", () => {
	it("Should return undefined ranges for an editor that never reported any", () => {
		// Act

		const actual = searchHighlightRegistry.getRanges("unknown");

		// Assert

		expect(actual).toBeUndefined();
	});

	it("Should return the ranges last set for an editor", () => {
		// Arrange

		const ranges = [makeRange(), makeRange()];

		// Act

		searchHighlightRegistry.setAll("split-1", ranges);

		// Assert

		expect(searchHighlightRegistry.getRanges("split-1")).toBe(ranges);
	});

	it("Should aggregate ranges from every editor into the all-matches highlight", () => {
		// Arrange

		const rangesA = [makeRange()];
		const rangesB = [makeRange(), makeRange()];

		// Act

		searchHighlightRegistry.setAll("split-1", rangesA);
		searchHighlightRegistry.setAll("split-2", rangesB);

		// Assert

		const highlight = highlights().get(ALL_HIGHLIGHT_NAME);
		expect(highlight?.ranges).toEqual([...rangesA, ...rangesB]);
	});

	it("Should delete the all-matches highlight when every editor reports zero ranges", () => {
		// Arrange

		searchHighlightRegistry.setAll("split-1", [makeRange()]);

		// Act

		searchHighlightRegistry.setAll("split-1", []);

		// Assert

		expect(highlights().has(ALL_HIGHLIGHT_NAME)).toBe(false);
	});

	it("Should drop an editor's ranges from the aggregate when cleared", () => {
		// Arrange

		const rangesA = [makeRange()];
		const rangesB = [makeRange()];
		searchHighlightRegistry.setAll("split-1", rangesA);
		searchHighlightRegistry.setAll("split-2", rangesB);

		// Act

		searchHighlightRegistry.clear("split-1");

		// Assert

		expect(highlights().get(ALL_HIGHLIGHT_NAME)?.ranges).toEqual(rangesB);
		expect(searchHighlightRegistry.getRanges("split-1")).toBeUndefined();
	});

	it("Should delete the all-matches highlight once the last editor is cleared", () => {
		// Arrange

		searchHighlightRegistry.setAll("split-1", [makeRange()]);

		// Act

		searchHighlightRegistry.clear("split-1");

		// Assert

		expect(highlights().has(ALL_HIGHLIGHT_NAME)).toBe(false);
	});

	it("Should set the current-match highlight to a single range", () => {
		// Arrange

		const range = makeRange();

		// Act

		searchHighlightRegistry.setCurrent(range);

		// Assert

		expect(highlights().get(CURRENT_HIGHLIGHT_NAME)?.ranges).toEqual([
			range,
		]);
	});

	it("Should delete the current-match highlight when set to null", () => {
		// Arrange

		searchHighlightRegistry.setCurrent(makeRange());

		// Act

		searchHighlightRegistry.setCurrent(null);

		// Assert

		expect(highlights().has(CURRENT_HIGHLIGHT_NAME)).toBe(false);
	});

	it("Should clear every editor's ranges and the current match when clearAll is called", () => {
		// Arrange

		searchHighlightRegistry.setAll("split-1", [makeRange()]);
		searchHighlightRegistry.setAll("split-2", [makeRange()]);
		searchHighlightRegistry.setCurrent(makeRange());

		// Act

		searchHighlightRegistry.clearAll();

		// Assert

		expect(highlights().has(ALL_HIGHLIGHT_NAME)).toBe(false);
		expect(highlights().has(CURRENT_HIGHLIGHT_NAME)).toBe(false);
		expect(searchHighlightRegistry.getRanges("split-1")).toBeUndefined();
		expect(searchHighlightRegistry.getRanges("split-2")).toBeUndefined();
	});
});

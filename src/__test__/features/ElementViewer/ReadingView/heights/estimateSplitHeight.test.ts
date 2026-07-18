import { describe, expect, it } from "vitest";
import { READING_SPLIT_MIN_HEIGHT_IN_PX } from "../../../../../features/ElementViewer/ReadingView/readingViewConstants";
import { estimateSplitHeight } from "../../../../../features/ElementViewer/ReadingView/heights/estimateSplitHeight";

describe("estimateSplitHeight", () => {
	it("Should return the minimum height when the content is empty", () => {
		// Act

		const actual = estimateSplitHeight(0, 720);

		// Assert

		expect(actual).toBe(READING_SPLIT_MIN_HEIGHT_IN_PX);
	});

	it("Should grow with the character count", () => {
		// Arrange

		const contentWidth = 720;

		// Act

		const more = estimateSplitHeight(100_000, contentWidth);
		const less = estimateSplitHeight(10_000, contentWidth);

		// Assert

		expect(more).toBeGreaterThan(less);
	});

	it("Should be shorter in a wider column for the same content", () => {
		// Arrange

		const charCount = 100_000;

		// Act

		const narrow = estimateSplitHeight(charCount, 400);
		const wide = estimateSplitHeight(charCount, 800);

		// Assert

		expect(wide).toBeLessThan(narrow);
	});
});

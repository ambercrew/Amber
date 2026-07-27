import { describe, expect, it } from "vitest";
import { findMatches } from "../../../../../components/Editor/plugins/SearchHighlightPlugin/findMatches";

describe("findMatches", () => {
	it("Should return no matches when the query is empty", () => {
		// Act

		const actual = findMatches("hello world", "", false);

		// Assert

		expect(actual).toEqual([]);
	});

	it("Should find every case-sensitive occurrence when caseSensitive is true", () => {
		// Act

		const actual = findMatches("Cat cat CAT", "cat", true);

		// Assert

		expect(actual).toEqual([{ start: 4, end: 7 }]);
	});

	it("Should find matches ignoring case when caseSensitive is false", () => {
		// Act

		const actual = findMatches("Cat cat CAT", "cat", false);

		// Assert

		expect(actual).toEqual([
			{ start: 0, end: 3 },
			{ start: 4, end: 7 },
			{ start: 8, end: 11 },
		]);
	});

	it("Should find overlapping matches", () => {
		// Act

		const actual = findMatches("aaaa", "aa", false);

		// Assert

		expect(actual).toEqual([
			{ start: 0, end: 2 },
			{ start: 1, end: 3 },
			{ start: 2, end: 4 },
		]);
	});

	it("Should return no matches when the query is not found", () => {
		// Act

		const actual = findMatches("hello world", "xyz", false);

		// Assert

		expect(actual).toEqual([]);
	});
});

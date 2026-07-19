/* eslint-disable @typescript-eslint/no-empty-function */
import { describe, expect, it, vi } from "vitest";
import { READING_VIEWPORT_TOP_OFFSET_IN_PX } from "../../../../../features/ElementViewer/ReadingView/readingViewConstants";
import { compensateScrollForResize } from "../../../../../features/ElementViewer/ReadingView/heights/scrollCompensation";

function elementWithTop(top: number): HTMLElement {
	const element = document.createElement("div");
	vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
		top,
	} as DOMRect);
	return element;
}

describe("compensateScrollForResize", () => {
	it("Should not scroll when the height did not change", () => {
		// Arrange

		const element = elementWithTop(0);
		const scrollBy = vi
			.spyOn(window, "scrollBy")
			.mockImplementation(() => {});

		// Act

		compensateScrollForResize(element, 500, 500);

		// Assert

		expect(scrollBy).not.toHaveBeenCalled();
	});

	it("Should not scroll when the element is still visible below the header", () => {
		// Arrange

		const element = elementWithTop(READING_VIEWPORT_TOP_OFFSET_IN_PX + 1);
		const scrollBy = vi
			.spyOn(window, "scrollBy")
			.mockImplementation(() => {});

		// Act

		compensateScrollForResize(element, 500, 600);

		// Assert

		expect(scrollBy).not.toHaveBeenCalled();
	});

	it("Should scroll by the height delta when the element is at the header offset", () => {
		// Arrange

		const element = elementWithTop(READING_VIEWPORT_TOP_OFFSET_IN_PX);
		const scrollBy = vi
			.spyOn(window, "scrollBy")
			.mockImplementation(() => {});

		// Act

		compensateScrollForResize(element, 500, 600);

		// Assert

		expect(scrollBy).toHaveBeenCalledWith(0, 100);
	});

	it("Should scroll by a negative delta when the element shrank above the viewport", () => {
		// Arrange

		const element = elementWithTop(-40);
		const scrollBy = vi
			.spyOn(window, "scrollBy")
			.mockImplementation(() => {});

		// Act

		compensateScrollForResize(element, 600, 500);

		// Assert

		expect(scrollBy).toHaveBeenCalledWith(0, -100);
	});
});

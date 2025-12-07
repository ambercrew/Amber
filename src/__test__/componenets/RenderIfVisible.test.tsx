import { render, screen } from "@testing-library/react";
import RenderIfVisible from "../../components/RenderIfVisible/RenderIfVisible";

describe("RenderIfVisible", () => {
	it("Should render element when it is visible", () => {
		// Arrange

		// @ts-expect-error IntersectionObserver is not found by default on the testing library.
		window.IntersectionObserver = class IntersectionObserver {
			constructor(cb: (entries: unknown[]) => void) {
				cb([
					{
						isIntersecting: true,
					},
				]);
			}

			observe = vi.fn();
			unobserve = vi.fn();
		};

		// Act

		render(<RenderIfVisible>Test</RenderIfVisible>);

		// Assert

		expect(screen.queryByText("Test")).not.toBeNull();
	});

	it("Should not render element when it is not visible", () => {
		// Arrange

		// @ts-expect-error IntersectionObserver is not found by default on the testing library.
		window.IntersectionObserver = class IntersectionObserver {
			constructor(cb: (entries: unknown[]) => void) {
				cb([
					{
						isIntersecting: false,
					},
				]);
			}

			observe = vi.fn();
			unobserve = vi.fn();
		};

		// Act

		render(<RenderIfVisible>Test</RenderIfVisible>);

		// Assert

		expect(screen.queryByText("Test")).toBeNull();
	});
});

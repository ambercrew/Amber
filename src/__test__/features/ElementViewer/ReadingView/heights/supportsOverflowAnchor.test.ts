import { afterEach, describe, expect, it, vi } from "vitest";

const originalCSS = globalThis.CSS;

afterEach(() => {
	globalThis.CSS = originalCSS;
	vi.resetModules();
});

describe("supportsOverflowAnchor", () => {
	it("Should return true when CSS.supports reports overflow-anchor support", async () => {
		// Arrange

		globalThis.CSS = {
			...originalCSS,
			supports: vi.fn().mockReturnValue(true),
		} as unknown as typeof CSS;
		const { supportsOverflowAnchor } =
			await import("../../../../../features/ElementViewer/ReadingView/heights/supportsOverflowAnchor");

		// Act

		const actual = supportsOverflowAnchor();

		// Assert

		expect(actual).toBe(true);
	});

	it("Should return false when CSS.supports reports no overflow-anchor support", async () => {
		// Arrange

		globalThis.CSS = {
			...originalCSS,
			supports: vi.fn().mockReturnValue(false),
		} as unknown as typeof CSS;
		const { supportsOverflowAnchor } =
			await import("../../../../../features/ElementViewer/ReadingView/heights/supportsOverflowAnchor");

		// Act

		const actual = supportsOverflowAnchor();

		// Assert

		expect(actual).toBe(false);
	});

	it("Should return false when CSS is unavailable", async () => {
		// Arrange

		// @ts-expect-error -- simulating an environment without a CSS global
		globalThis.CSS = undefined;
		const { supportsOverflowAnchor } =
			await import("../../../../../features/ElementViewer/ReadingView/heights/supportsOverflowAnchor");

		// Act

		const actual = supportsOverflowAnchor();

		// Assert

		expect(actual).toBe(false);
	});

	it("Should only call CSS.supports once across repeated calls", async () => {
		// Arrange

		const supports = vi.fn().mockReturnValue(true);
		globalThis.CSS = { ...originalCSS, supports } as unknown as typeof CSS;
		const { supportsOverflowAnchor } =
			await import("../../../../../features/ElementViewer/ReadingView/heights/supportsOverflowAnchor");

		// Act

		supportsOverflowAnchor();
		supportsOverflowAnchor();

		// Assert

		expect(supports).toHaveBeenCalledTimes(1);
	});
});

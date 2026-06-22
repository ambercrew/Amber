import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import formatDueDate from "../../utils/formatDueDate";

describe("formatDueDate", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 5, 13)); // June 13 2026
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("Should return 'today' when date is today", () => {
		// Arrange

		const input = "2026-06-13T00:00:00.000Z";

		// Act

		const actual = formatDueDate(input);

		// Assert

		expect(actual).toBe("today");
	});

	it("Should return a localized date string when date is in the past", () => {
		// Arrange

		const input = "2026-06-20T05:00:00.000Z";

		// Act

		const actual = formatDueDate(input);

		// Assert

		expect(actual).toMatch(/Jun(e)?\s20/);
	});

	it("Should return 'tomorrow' when date is one day ahead", () => {
		// Arrange

		const input = "2026-06-14T00:00:00.000Z";

		// Act

		const actual = formatDueDate(input);

		// Assert

		expect(actual).toBe("tomorrow");
	});

	it("Should return a localized date string when date is more than one day ahead", () => {
		// Arrange

		const input = new Date(2026, 5, 20, 5).toISOString();

		// Act

		const actual = formatDueDate(input);

		// Assert

		expect(actual).toMatch(/Jun(e)?\s20/);
	});
});

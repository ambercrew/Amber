import { formatTrashCountdown } from "../../utils/formatTrashCountdown";

const MILLISECONDS_PER_DAY = 86_400_000;

function daysAgo(days: number): string {
	return new Date(Date.now() - days * MILLISECONDS_PER_DAY).toISOString();
}

describe("formatTrashCountdown", () => {
	it("Should return the full retention window when the element was just trashed", () => {
		// Arrange

		const trashedAt = daysAgo(0);

		// Act

		const actual = formatTrashCountdown(trashedAt, 30);

		// Assert

		expect(actual).toBe("30 days left");
	});

	it("Should return the remaining days when part of the window has passed", () => {
		// Arrange

		const trashedAt = daysAgo(10);

		// Act

		const actual = formatTrashCountdown(trashedAt, 30);

		// Assert

		expect(actual).toBe("20 days left");
	});

	it("Should use the singular when only one day is left", () => {
		// Arrange

		const trashedAt = daysAgo(29);

		// Act

		const actual = formatTrashCountdown(trashedAt, 30);

		// Assert

		expect(actual).toBe("1 day left");
	});

	it("Should say deleting soon when the retention window has passed", () => {
		// Arrange

		const trashedAt = daysAgo(31);

		// Act

		const actual = formatTrashCountdown(trashedAt, 30);

		// Assert

		expect(actual).toBe("Deleting soon");
	});
});

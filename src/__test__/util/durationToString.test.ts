import durationToString from "../../utils/durationToString";

describe(durationToString, () => {
	it("Displays minutes correctly", () => {
		// Arrange

		const startDate = new Date(2024, 12, 12, 12, 50);
		const endDate = new Date(2024, 12, 12, 12, 55);

		// Act

		const actual = durationToString(startDate, endDate);

		// Assert

		expect(actual).toBe("5m");
	});

	it("Displays hours correctly", () => {
		// Arrange

		const startDate = new Date(2024, 12, 12, 10, 50);
		const endDate = new Date(2024, 12, 12, 12, 50);

		// Act

		const actual = durationToString(startDate, endDate);

		// Assert

		expect(actual).toBe("2h");
	});

	it("Displays days correctly", () => {
		// Arrange

		const startDate = new Date(2024, 12, 12, 12, 50);
		const endDate = new Date(2024, 12, 15, 12, 50);

		// Act

		const actual = durationToString(startDate, endDate);

		// Assert

		expect(actual).toBe("3d");
	});

	it("Displays months correctly", () => {
		// Arrange

		const startDate = new Date(2024, 10, 12, 12, 50);
		const endDate = new Date(2024, 12, 12, 12, 50);

		// Act

		const actual = durationToString(startDate, endDate);

		// Assert

		expect(actual).toBe("2 months");
	});
});

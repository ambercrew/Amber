import getFileName from "../../utils/getFileName";

describe(getFileName, () => {
	it("Works on full path", () => {
		// Arrange

		const path = "file 1/file 2";

		// Act

		const actual = getFileName(path);

		// Assert

		expect(actual).toBe("file 2");
	});

	it("Works on just a file name", () => {
		// Arrange

		const path = "file 1";

		// Act

		const actual = getFileName(path);

		// Assert

		expect(actual).toBe("file 1");
	});
});

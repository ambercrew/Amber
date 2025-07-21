import ParsedFile from "../../types/parsedFile";
import ParsedFolder from "../../types/parsedFolder";
import getFolderChildById from "../../utils/getFolderChildById";

describe(getFolderChildById, () => {
	it("Returns existing file", () => {
		// Arrange

		const expectedFile: ParsedFile = {
			id: 2,
			name: "test",
			repetitionCounts: {
				new: 0,
				learning: 0,
				relearning: 0,
				review: 0,
			},
		};
		const folder: ParsedFolder = {
			id: 1,
			name: "",
			files: [expectedFile],
			subFolders: [],
			repetitionCounts: {
				new: 0,
				learning: 0,
				relearning: 0,
				review: 0,
			},
		};

		// Act

		const actual = getFolderChildById(folder, expectedFile.id);

		// Assert

		expect(actual).toStrictEqual(expectedFile);
	});

	it("Returns existing folder", () => {
		// Arrange

		const expectedFolder: ParsedFolder = {
			id: 2,
			name: "test",
			subFolders: [],
			files: [],
			repetitionCounts: {
				new: 0,
				learning: 0,
				relearning: 0,
				review: 0,
			},
		};
		const folder: ParsedFolder = {
			id: 1,
			name: "",
			files: [],
			subFolders: [expectedFolder],
			repetitionCounts: {
				new: 0,
				learning: 0,
				relearning: 0,
				review: 0,
			},
		};

		// Act

		const actual = getFolderChildById(folder, expectedFolder.id);

		// Assert

		expect(actual).toStrictEqual(expectedFolder);
	});

	it("Non existing file", () => {
		// Arrange

		const folder: ParsedFolder = {
			id: 1,
			name: "",
			files: [],
			subFolders: [],
			repetitionCounts: {
				new: 0,
				learning: 0,
				relearning: 0,
				review: 0,
			},
		};

		// Act

		const actual = getFolderChildById(folder, 4);

		// Assert

		expect(actual).toBeNull();
	});
});

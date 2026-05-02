import { ReviewTreeFileDto } from "../../api/fileSystem/dto/reviewTreeFileDto";
import { ReviewTreeFolderDto } from "../../api/fileSystem/dto/reviewTreeFolderDto";
import getFolderChildById from "../../utils/getFolderChildById";

describe("getFolderChildById", () => {
	it("Returns existing file", () => {
		// Arrange

		const expectedFile: ReviewTreeFileDto = {
			id: "2",
			name: "test",
			repetitionCounts: {
				new: 0,
				learning: 0,
				relearning: 0,
				review: 0,
			},
		};
		const folder: ReviewTreeFolderDto = {
			id: "1",
			name: "",
			files: [expectedFile],
			subfolders: [],
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

		const expectedFolder: ReviewTreeFolderDto = {
			id: "2",
			name: "test",
			subfolders: [],
			files: [],
			repetitionCounts: {
				new: 0,
				learning: 0,
				relearning: 0,
				review: 0,
			},
		};
		const folder: ReviewTreeFolderDto = {
			id: "1",
			name: "",
			files: [],
			subfolders: [expectedFolder],
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

		const folder: ReviewTreeFolderDto = {
			id: "1",
			name: "",
			files: [],
			subfolders: [],
			repetitionCounts: {
				new: 0,
				learning: 0,
				relearning: 0,
				review: 0,
			},
		};

		// Act

		const actual = getFolderChildById(folder, "4");

		// Assert

		expect(actual).toBeNull();
	});
});

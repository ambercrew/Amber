import ParsedFolder from "../../types/parsedFolder";
import UiFolder from "../../types/ui/uiFolder";
import searchFolder from "../../utils/searchFolder";

describe(searchFolder, () => {
	it("Searches folder correctly", () => {
		// Arrange

		const repetitionCounts = {
			new: 0,
			learning: 0,
			relearning: 0,
			review: 0,
		};

		const folder: ParsedFolder = {
			id: 0,
			name: "",
			files: [
				{
					id: 1,
					name: "search",
					repetitionCounts,
				},
				{
					id: 2,
					name: "not visible",
					repetitionCounts,
				},
			],
			subFolders: [
				{
					id: 3,
					name: "test",
					subFolders: [],
					files: [
						{
							id: 4,
							name: "search file",
							repetitionCounts,
						},
					],

					repetitionCounts,
				},
				{
					id: 4,
					// Should not be visible since none of its files include "search".
					name: "search",
					subFolders: [],
					files: [],
					repetitionCounts,
				},
			],
			repetitionCounts,
		};
		const expected: UiFolder = {
			id: 0,
			name: "",
			isVisible: true,
			files: [
				{
					id: 1,
					name: "search",
					isVisible: true,
					repetitionCounts,
				},
				{
					id: 2,
					name: "not visible",
					isVisible: false,
					repetitionCounts,
				},
			],
			subFolders: [
				{
					id: 3,
					name: "test",
					subFolders: [],
					isVisible: true,
					files: [
						{
							id: 4,
							name: "search file",
							isVisible: true,
							repetitionCounts,
						},
					],
					repetitionCounts,
				},
				{
					id: 4,
					// Should not be visible since none of its files include "search".
					name: "search",
					subFolders: [],
					files: [],
					isVisible: false,
					repetitionCounts,
				},
			],
			repetitionCounts,
		};

		// Act

		const actual = searchFolder(folder, "search");

		// Assert

		expect(actual).toStrictEqual(expected);
	});
});

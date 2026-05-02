import UiFolder from "../../../../types/ui/uiFolder";
import searchFolder from "../../../../features/SideBar/utils/searchFolder";
import { ReviewTreeFolderDto } from "../../../../api/fileSystem/dto/reviewTreeFolderDto";

describe("searchFolder", () => {
	it("Searches folder correctly", () => {
		// Arrange

		const repetitionCounts = {
			new: 0,
			learning: 0,
			relearning: 0,
			review: 0,
		};

		const folder: ReviewTreeFolderDto = {
			id: "0",
			name: "",
			files: [
				{
					id: "1",
					name: "search",
					repetitionCounts,
				},
				{
					id: "2",
					name: "not visible",
					repetitionCounts,
				},
			],
			subfolders: [
				{
					id: "3",
					name: "test",
					subfolders: [],
					files: [
						{
							id: "4",
							name: "search file",
							repetitionCounts,
						},
					],

					repetitionCounts,
				},
				{
					id: "4",
					name: "search",
					subfolders: [],
					files: [],
					repetitionCounts,
				},
			],
			repetitionCounts,
		};
		const expected: UiFolder = {
			id: "0",
			name: "",
			isVisible: true,
			files: [
				{
					id: "1",
					name: "search",
					isVisible: true,
					repetitionCounts,
				},
				{
					id: "2",
					name: "not visible",
					isVisible: false,
					repetitionCounts,
				},
			],
			subfolders: [
				{
					id: "3",
					name: "test",
					subfolders: [],
					isVisible: true,
					files: [
						{
							id: "4",
							name: "search file",
							isVisible: true,
							repetitionCounts,
						},
					],
					repetitionCounts,
				},
				{
					id: "4",
					name: "search",
					subfolders: [],
					files: [],
					isVisible: true,
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

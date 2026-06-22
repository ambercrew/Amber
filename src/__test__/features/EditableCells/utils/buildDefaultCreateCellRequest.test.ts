import buildDefaultCreateCellRequest from "../../../../features/EditableCells/utils/buildDefaultCreateCellRequest";
import CreateCellRequestDto from "../../../../api/cells/dto/createCellRequestDto";
import IncrementalReading from "../../../../api/cells/valueObjects/incrementalReading";

describe("buildDefaultCreateCellRequest", () => {
	it("Note", () => {
		// Arrange

		const fileId = "2";
		const index = 3;
		const expected: CreateCellRequestDto = {
			cellType: "Note",
			content: "",
			fileId,
			index,
		};

		// Act

		const actual = buildDefaultCreateCellRequest("Note", fileId, index);

		// Assert

		expect(actual).toStrictEqual(expected);
	});

	it("IncrementalReading", () => {
		// Arrange

		const fileId = "2";
		const index = 3;
		const expectedContent: IncrementalReading = {
			content: null,
			priority: "normal",
			source: {
				type: "url",
				url: "",
			},
			title: null,
			completed: false,
			scrollPosition: null,
		};
		const expected: CreateCellRequestDto = {
			cellType: "IncrementalReading",
			content: JSON.stringify(expectedContent),
			fileId,
			index,
		};

		// Act

		const actual = buildDefaultCreateCellRequest(
			"IncrementalReading",
			fileId,
			index,
		);

		// Assert

		expect(actual).toStrictEqual(expected);
	});
});

import createDefaultCellDto from "../../../../features/EditableCells/utils/createCreateCellRequestDto";
import CreateCellRequestDto from "../../../../api/cells/dto/createCellRequestDto";

describe("createDefaultCell", () => {
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

		const actual = createDefaultCellDto("Note", fileId, index);

		// Assert

		expect(actual).toStrictEqual(expected);
	});
});

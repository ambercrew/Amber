import createDefaultCell from "../../../../features/EditableCells/utils/createDefaultCell";
import Cell from "../../../../types/backend/entity/cell";

describe(createDefaultCell, () => {
	it("Note", () => {
		// Arrange

		const fileId = 2;
		const index = 3;
		const expected: Cell = {
            id: 0,
			cellType: "Note",
			content: "",
			searchableContent: "",
			fileId,
			index,
		};

		// Act

		const actual = createDefaultCell("Note", fileId, index);

		// Assert

		expect(actual).toStrictEqual(expected);
	});
});

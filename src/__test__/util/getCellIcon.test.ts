import {
	mdiCardMultipleOutline,
	mdiCheckCircleOutline,
	mdiDotsHorizontal,
	mdiNoteOutline,
} from "@mdi/js";
import getCellIcon from "../../utils/getCellIcon";
import { CellType } from "../../types/backend/entity/cell";

describe(getCellIcon, () => {
	it("Returns correct icon", () => {
		// Arrange

		const typesIcons = [
			["FlashCard", mdiCardMultipleOutline],
			["Note", mdiNoteOutline],
			["Cloze", mdiDotsHorizontal],
			["TrueFalse", mdiCheckCircleOutline],
		];

		// Act & Assert

		for (const typeIcon of typesIcons) {
			const actual = getCellIcon(typeIcon[0] as CellType);
			expect(actual).toBe(typeIcon[1]);
		}
	});
});

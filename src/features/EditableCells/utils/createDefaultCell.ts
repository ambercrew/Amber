import Cell, { CellType } from "../../../types/backend/entity/cell";
import FlashCard from "../../../types/backend/value_objects/flashCard";
import TrueFalse from "../../../types/backend/value_objects/trueFalse";

function createDefaultCell(cellType: CellType, fileId: number, index: number) {
	const cell: Cell = {
		id: 0,
		fileId,
		content: "",
		searchableContent: "",
		cellType,
		index,
	};

	switch (cellType) {
		case "FlashCard":
			cell.content = JSON.stringify({
				question: "",
				answer: "",
			} as FlashCard);
			break;
		case "TrueFalse":
			cell.content = JSON.stringify({
				question: "",
				isTrue: true,
			} as TrueFalse);
			break;
		case "Note":
		case "Cloze":
			break;
	}
	return cell;
}

export default createDefaultCell;

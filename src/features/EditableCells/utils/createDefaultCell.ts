import Cell, { CellType } from "../../../types/backend/entity/cell";
import FlashCard from "../../../types/backend/valueObjects/flashCard";
import TrueFalse from "../../../types/backend/valueObjects/trueFalse";

function createDefaultCell(cellType: CellType, fileId: string, index: number) {
	const cell: Cell = {
		id: "",
		fileId,
		content: "",
		searchableContent: "",
		cellType,
		index,
		repetitions: [],
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

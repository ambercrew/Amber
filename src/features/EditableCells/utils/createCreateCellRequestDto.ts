import { CellType } from "../../../api/cells/entities/cell";
import CreateCellRequestDto from "../../../api/cells/dto/createCellRequestDto";
import FlashCard from "../../../api/cells/valueObjects/flashCard";
import TrueFalse from "../../../api/cells/valueObjects/trueFalse";

function createDefaultCellDto(
	cellType: CellType,
	fileId: string,
	index: number,
): CreateCellRequestDto {
	const request: CreateCellRequestDto = {
		fileId,
		content: "",
		cellType,
		index,
	};

	switch (cellType) {
		case "FlashCard":
			request.content = JSON.stringify({
				question: "",
				answer: "",
			} as FlashCard);
			break;
		case "TrueFalse":
			request.content = JSON.stringify({
				question: "",
				isTrue: true,
			} as TrueFalse);
			break;
		case "Note":
		case "Cloze":
			break;
	}
	return request;
}

export default createDefaultCellDto;

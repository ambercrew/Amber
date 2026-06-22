import { CellType } from "../../../api/cells/entities/cell";
import CreateCellRequestDto from "../../../api/cells/dto/createCellRequestDto";
import FlashCard from "../../../api/cells/valueObjects/flashCard";
import TrueFalse from "../../../api/cells/valueObjects/trueFalse";
import IncrementalReading from "../../../api/cells/valueObjects/incrementalReading";

function buildDefaultCreateCellRequest(
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
		case "IncrementalReading":
			request.content = JSON.stringify({
				content: null,
				priority: "normal",
				source: {
					type: "url",
					url: "",
				},
				title: null,
				completed: false,
				scrollPosition: null,
			} as IncrementalReading);
			break;
		case "Note":
		case "Cloze":
			break;
	}
	return request;
}

export default buildDefaultCreateCellRequest;

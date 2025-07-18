import {
	mdiCardMultipleOutline,
	mdiCheckCircleOutline,
	mdiDotsHorizontal,
	mdiNoteOutline,
} from "@mdi/js";
import { CellType } from "../types/backend/entity/cell";

function getCellIcon(cellType: CellType): string {
	switch (cellType) {
		case "FlashCard":
			return mdiCardMultipleOutline;
		case "Note":
			return mdiNoteOutline;
		case "Cloze":
			return mdiDotsHorizontal;
		case "TrueFalse":
			return mdiCheckCircleOutline;
	}
}

export default getCellIcon;

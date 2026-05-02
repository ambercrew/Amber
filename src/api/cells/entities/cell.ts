import Repetition from "./repetition";

export type CellType = "FlashCard" | "Note" | "Cloze" | "TrueFalse";
export const allCellTypes: CellType[] = [
	"FlashCard",
	"Cloze",
	"Note",
	"TrueFalse",
];
export const cellTypesDisplayNames: Record<CellType, string> = {
	Note: "Note",
	Cloze: "Cloze",
	FlashCard: "Flash Card",
	TrueFalse: "True/False",
};

export default interface Cell {
	id: string;
	fileId: string;
	content: string;
	searchableContent: string;
	cellType: CellType;
	index: number;
	repetitions: Repetition[];
}

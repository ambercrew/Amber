import Repetition from "./repetition";

export const allCellTypes = [
	"FlashCard",
	"Cloze",
	"Note",
	"TrueFalse",
	"IncrementalReading",
] as const;

export type CellType = (typeof allCellTypes)[number];

export const cellTypesDisplayNames: Record<CellType, string> = {
	Note: "Note",
	Cloze: "Cloze",
	FlashCard: "Flash Card",
	TrueFalse: "True/False",
	IncrementalReading: "Incremental reading",
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

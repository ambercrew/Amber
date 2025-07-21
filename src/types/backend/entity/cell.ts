export type CellType = "FlashCard" | "Note" | "Cloze" | "TrueFalse";
export const allCellTypes: CellType[] = [
	"Cloze",
	"FlashCard",
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
    // TODO: id should not be nullable
	id?: number;
	fileId: number;
	content: string;
	searchableContent: string;
	cellType: CellType;
	index: number;
}

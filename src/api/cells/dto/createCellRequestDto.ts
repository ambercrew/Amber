import { CellType } from "../entities/cell";

export default interface CreateCellRequestDto {
	fileId: string;
	content: string;
	cellType: CellType;
	index: number;
}

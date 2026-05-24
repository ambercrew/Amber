import { invoke } from "@tauri-apps/api/core";
import Cell from "../entities/cell";
import UpdateCellRequestDto from "../dto/updateCellRequestDto";
import CreateCellRequestDto from "../dto/createCellRequestDto";
import { CellWithFsrsProfileIdDto } from "../dto/cellWithFsrsProfileIdDto";

export function getFileCellsOrderedByIndex(fileId: string): Promise<Cell[]> {
	return invoke("get_file_cells_ordered_by_index", {
		fileId,
	});
}

export function updateCellsContents(requests: UpdateCellRequestDto[]) {
	return invoke("update_cells_contents", { requests });
}

export function createCell(request: CreateCellRequestDto): Promise<string> {
	return invoke("create_cell", { request });
}

export function deleteCell(id: string) {
	return invoke("delete_cell", { id });
}

export function moveCell(id: string, newIndex: number) {
	return invoke("move_cell", {
		id,
		newIndex,
	});
}

export function moveCellToFile(cellId: string, fileId: string) {
	return invoke("move_cell_to_file", {
		cellId,
		fileId,
	});
}

export function getCellsForFilesWithFsrsProfileIds(
	fileIds: string[],
): Promise<CellWithFsrsProfileIdDto[]> {
	return invoke("get_cells_for_files_with_fsrs_profile_ids", { fileIds });
}

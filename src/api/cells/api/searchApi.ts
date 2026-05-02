import { invoke } from "@tauri-apps/api/core";
import Cell from "../entities/cell";

export function searchCells(searchText: string): Promise<Cell[]> {
	return invoke("search_cells", { searchText });
}

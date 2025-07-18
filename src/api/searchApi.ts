import { invoke } from "@tauri-apps/api/core";
import SearchResult from "../types/backend/dto/searchResult";

export function searchCells(searchText: string): Promise<SearchResult> {
	return invoke("search_cells", { searchText });
}

import { invoke } from "@tauri-apps/api/core";
import FolderNodeDto from "../dto/folderNodeDto";

export function getElementTree(): Promise<FolderNodeDto[]> {
	return invoke("get_element_tree");
}

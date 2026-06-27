import { invoke } from "@tauri-apps/api/core";
import { ElementId } from "../../../types/elements/elementId";
import FolderNodeDto from "../dto/folderNodeDto";

export function getElementTree(): Promise<FolderNodeDto[]> {
	return invoke("get_element_tree");
}

export function deleteElement(elementId: ElementId): Promise<void> {
	return invoke("delete_element", { elementId });
}

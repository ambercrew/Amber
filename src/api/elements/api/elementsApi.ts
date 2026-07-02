import { invoke } from "@tauri-apps/api/core";
import { CreateCardDto } from "../../../types/elements/createCardDto";
import { CreateExtractDto } from "../../../types/elements/createExtractDto";
import { CreateFolderDto } from "../../../types/elements/createFolderDto";
import { CreateReadingDto } from "../../../types/elements/createReadingDto";
import { ElementId } from "../../../types/elements/elementId";
import { UpdateCardDto } from "../../../types/elements/updateCardDto";
import { UpdateExtractDto } from "../../../types/elements/updateExtractDto";
import { UpdateReadingDto } from "../../../types/elements/updateReadingDto";
import { AnyElementDto } from "../dto/anyElementDto";
import { NodeDto } from "../dto/nodeDto";

export function getElementTree(): Promise<NodeDto[]> {
	return invoke("get_element_tree");
}

export function deleteElement(elementId: ElementId): Promise<void> {
	return invoke("delete_element", { elementId });
}

export function renameElement(
	elementId: ElementId,
	newName: string,
): Promise<void> {
	return invoke("rename_element", { elementId, newName });
}

export function createFolder(dto: CreateFolderDto): Promise<void> {
	return invoke("create_folder", { dto });
}

export function createReading(dto: CreateReadingDto): Promise<void> {
	return invoke("create_reading", { dto });
}

export function createExtract(dto: CreateExtractDto): Promise<void> {
	return invoke("create_extract", { dto });
}

export function createCard(dto: CreateCardDto): Promise<void> {
	return invoke("create_card", { dto });
}

export function updateReading(dto: UpdateReadingDto): Promise<void> {
	return invoke("update_reading", { dto });
}

export function updateExtract(dto: UpdateExtractDto): Promise<void> {
	return invoke("update_extract", { dto });
}

export function updateCard(dto: UpdateCardDto): Promise<void> {
	return invoke("update_card", { dto });
}

export function elementExists(elementId: ElementId): Promise<boolean> {
	return invoke("element_exists", { elementId });
}

export function getElementById(elementId: ElementId): Promise<AnyElementDto> {
	return invoke("get_element_by_id", { elementId });
}

export type DropPosition = "before" | "after" | "inside";

export interface MoveElementDto {
	draggedId: ElementId;
	targetId: ElementId | null;
	position: DropPosition;
}

export function moveElement(dto: MoveElementDto): Promise<void> {
	return invoke("move_element", { dto });
}

export function updateElementTags(
	elementId: ElementId,
	tags: string[],
): Promise<void> {
	return invoke("update_element_tags", { elementId, tags });
}

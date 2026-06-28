import { ElementId } from "./elementId";

// TODO: metadata could be its own dto for create dtos
export interface CreateFolderDto {
	name: string;
	parent: ElementId | null;
}

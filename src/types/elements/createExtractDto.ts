import { ElementId } from "./elementId";

export interface CreateExtractDto {
	name: string;
	parent: ElementId | null;
	text: string;
}

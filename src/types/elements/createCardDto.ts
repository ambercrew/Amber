import { ElementId } from "./elementId";

export interface CreateCardDto {
	name: string;
	parent: ElementId | null;
	front: string;
	back: string;
}

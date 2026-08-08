import { ElementId } from "./elementId";
import { Tag } from "./tag";

export interface Meta {
	elementId: string;
	name: string;
	parent: ElementId | null;
	position: number;
	tags: Tag[];
	createdAt: string;
	modifiedAt: string;
	removedAt: string | null;
}

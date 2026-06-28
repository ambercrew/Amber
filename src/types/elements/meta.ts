import { ElementId } from "./elementId";

export interface Meta {
	id: string;
	name: string;
	parent: ElementId | null;
	position: number;
	createdAt: string;
	modifiedAt: string;
	removedAt: string | null;
}

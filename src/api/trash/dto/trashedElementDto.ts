import { ElementId } from "../../../types/elements/elementId";

export interface TrashedElementDto {
	elementId: ElementId;
	name: string;
	trashedAt: string;
	descendantCount: number;
}

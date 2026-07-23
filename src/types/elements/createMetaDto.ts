import { ElementId } from "./elementId";

export interface CreateMetaDto {
	name: string;
	parent: ElementId | null;
	derivedFrom?: ElementId | null;
	sourceId?: string | null;
}

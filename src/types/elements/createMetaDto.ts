import { ElementId } from "./elementId";
import { Origin } from "./origin";

export interface CreateMetaDto {
	name: string;
	parent: ElementId | null;
	origin: Origin;
}

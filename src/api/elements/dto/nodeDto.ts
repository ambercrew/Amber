import { ElementId } from "../../../types/elements/elementId";

export interface NodeDto {
	meta: MetaNodeDto;
	children: NodeChildrenDto;
}

export interface MetaNodeDto {
	id: ElementId;
	name: string;
	position: string;
	tags: string[];
}

export interface NodeChildrenDto {
	folders: NodeDto[];
	readings: NodeDto[];
	extracts: NodeDto[];
	cards: NodeDto[];
}

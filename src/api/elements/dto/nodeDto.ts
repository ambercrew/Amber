export interface NodeDto {
	meta: MetaNodeDto;
	children: NodeChildrenDto;
}

export interface MetaNodeDto {
	id: string;
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

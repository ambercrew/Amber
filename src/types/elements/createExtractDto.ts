import { ExtractParent } from "./extractParent";

export interface CreateExtractDto {
	name: string;
	position: number;
	parent: ExtractParent;
	text: string;
}

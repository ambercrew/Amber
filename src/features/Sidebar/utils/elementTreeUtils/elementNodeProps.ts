import { ElementNodeType } from "../../../../types/elements/elementNodeType";

export interface ElementNodeProps {
	type: ElementNodeType;
	position: string;
	childrenCount: number;
}

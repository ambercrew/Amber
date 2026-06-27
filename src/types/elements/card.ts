import { Meta } from "./meta";
import { CardParent } from "./cardParent";

export interface Card {
	meta: Meta;
	parent: CardParent;
	tags: string[];
	front: string;
	back: string;
}

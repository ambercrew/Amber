import { CardParent } from "./cardParent";

export interface CreateCardDto {
	name: string;
	position: number;
	parent: CardParent;
	front: string;
	back: string;
}

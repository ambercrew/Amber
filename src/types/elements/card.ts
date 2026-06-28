import { Meta } from "./meta";

export interface Card {
	meta: Meta;
	tags: string[];
	front: string;
	back: string;
}

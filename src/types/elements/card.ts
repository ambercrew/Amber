import { Meta } from "./meta";
import { Provenance } from "./provenance";

export interface Card {
	meta: Meta;
	parent: Provenance;
	tags: string[];
	front: string;
	back: string;
}

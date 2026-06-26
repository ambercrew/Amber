import { Meta } from "./meta";
import { Provenance } from "./provenance";

export interface Card {
	meta: Meta;
	concepts: string[];
	parent: Provenance;
	front: string;
	back: string;
}

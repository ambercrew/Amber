import { Meta } from "./meta";
import { Provenance } from "./provenance";

export interface Extract {
	meta: Meta;
	parent: Provenance;
	tags: string[];
	text: string;
}

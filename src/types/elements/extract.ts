import { Meta } from "./meta";
import { Provenance } from "./provenance";

export interface Extract {
	meta: Meta;
	concepts: string[];
	parent: Provenance;
	text: string;
}

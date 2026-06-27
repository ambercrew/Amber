import { Meta } from "./meta";
import { ExtractParent } from "./extractParent";

export interface Extract {
	meta: Meta;
	parent: ExtractParent;
	tags: string[];
	text: string;
}

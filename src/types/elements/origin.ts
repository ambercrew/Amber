import { ElementId } from "./elementId";

export type Origin =
	| { type: "inherited" }
	| {
			type: "custom";
			derivedFrom?: ElementId | null;
			bibliographicalSourceId?: string | null;
	  };

import { Card } from "./card";
import { Concept } from "./concept";
import { Extract } from "./extract";
import { Reading } from "./reading";

export type AnyElement =
	| { type: "concept"; data: Concept }
	| { type: "reading"; data: Reading }
	| { type: "extract"; data: Extract }
	| { type: "card"; data: Card };

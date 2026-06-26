import { Card } from "./card";
import { Extract } from "./extract";
import { Folder } from "./folder";
import { Reading } from "./reading";
import { Tag } from "./tag";

export type AnyElement =
	| { type: "folder"; data: Folder }
	| { type: "tag"; data: Tag }
	| { type: "reading"; data: Reading }
	| { type: "extract"; data: Extract }
	| { type: "card"; data: Card };

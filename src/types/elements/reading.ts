import { Meta } from "./meta";

export type ReadingSource =
	| { type: "website"; url: string }
	| { type: "clipboard" }
	| { type: "pdf" };

export interface Reading {
	meta: Meta;
	source: ReadingSource;
	body: string;
}

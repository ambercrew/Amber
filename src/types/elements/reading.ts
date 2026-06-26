import { Meta } from "./meta";

export type ReadingSource =
	| { type: "article"; url: string }
	| { type: "clipboard" }
	| { type: "pdf" };

export interface Reading {
	meta: Meta;
	concepts: string[];
	source: ReadingSource;
	body: string;
}

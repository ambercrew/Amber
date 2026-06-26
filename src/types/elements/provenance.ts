export type Provenance =
	| { type: "reading"; id: string }
	| { type: "extract"; id: string };

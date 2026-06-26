export type Provenance =
	| { type: "concept"; id: string }
	| { type: "reading"; id: string }
	| { type: "extract"; id: string };

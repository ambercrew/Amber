export type ExtractParent =
	| { type: "reading"; id: string }
	| { type: "extract"; id: string }
	| { type: "folder"; id: string };

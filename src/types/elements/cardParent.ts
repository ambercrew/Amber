export type CardParent =
	| { type: "reading"; id: string }
	| { type: "extract"; id: string }
	| { type: "folder"; id: string };

export type FetchedPageDto =
	| { kind: "html"; finalUrl: string; text: string }
	| { kind: "pdf"; finalUrl: string; bytesBase64: string }
	| { kind: "other"; finalUrl: string; contentType: string };

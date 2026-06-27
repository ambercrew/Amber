import { ElementNodeType } from "./types/elements/elementNodeType";

export const paths = {
	root: () => "/",
	element: (type: ElementNodeType, id: string) => `/${type}/${id}`,
} as const;

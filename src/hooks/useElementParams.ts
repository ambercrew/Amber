import { useParams } from "react-router";
import { ElementId } from "../types/elements/elementId";
import { ElementNodeType } from "../types/elements/elementNodeType";

export function useElementParams(): ElementId | null {
	const { type, id } = useParams();
	if (!type || !id) return null;
	return { type: type as ElementNodeType, id };
}

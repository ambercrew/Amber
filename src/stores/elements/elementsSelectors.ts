import { NodeDto } from "../../api/elements/dto/nodeDto";
import { ElementId } from "../../types/elements/elementId";
import { ElementNodeType } from "../../types/elements/elementNodeType";
import { RootState } from "../store";

export interface PathItem {
	id: ElementId;
	name: string;
}

export const selectElementTree = (state: RootState) => state.elements.tree;
export const selectElementTreeIsLoading = (state: RootState) =>
	state.elements.isLoading;
export const selectElementTreeError = (state: RootState) =>
	state.elements.error;

export function getElementPath(
	tree: NodeDto[],
	selected: ElementId | null,
): PathItem[] {
	if (!selected) return [];
	return findPath(tree, "folder", selected, []) ?? [];
}

function findPath(
	nodes: NodeDto[],
	type: ElementNodeType,
	target: ElementId,
	path: PathItem[],
): PathItem[] | null {
	for (const node of nodes) {
		const next = [
			...path,
			{ id: { type, id: node.meta.id }, name: node.meta.name },
		];
		if (type === target.type && node.meta.id === target.id) return next;
		const found =
			findPath(node.children.folders, "folder", target, next) ??
			findPath(node.children.readings, "reading", target, next) ??
			findPath(node.children.extracts, "extract", target, next) ??
			findPath(node.children.cards, "card", target, next);
		if (found) return found;
	}
	return null;
}

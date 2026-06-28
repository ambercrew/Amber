import { NodeDto } from "../../api/elements/dto/nodeDto";
import { ElementId } from "../../types/elements/elementId";
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
	return findPath(tree, selected, []) ?? [];
}

function findPath(
	nodes: NodeDto[],
	target: ElementId,
	path: PathItem[],
): PathItem[] | null {
	for (const node of nodes) {
		const next: PathItem[] = [
			...path,
			{ id: node.meta.id, name: node.meta.name },
		];
		if (node.meta.id.type === target.type && node.meta.id.id === target.id)
			return next;
		const found =
			findPath(node.children.folders, target, next) ??
			findPath(node.children.readings, target, next) ??
			findPath(node.children.extracts, target, next) ??
			findPath(node.children.cards, target, next);
		if (found) return found;
	}
	return null;
}

import { TreeNodeData } from "@mantine/core";
import { ElementNodeType } from "../../../../types/elements/elementNodeType";
import { ElementNodeProps } from "./elementNodeProps";

export function findNodeType(
	nodes: TreeNodeData[],
	value: string,
): ElementNodeType | null {
	for (const node of nodes) {
		if (node.value === value)
			return (node.nodeProps as ElementNodeProps).type;
		if (node.children) {
			const found = findNodeType(node.children, value);
			if (found) return found;
		}
	}
	return null;
}

// Returns null = root level, ElementNodeType = has a parent, undefined = not found
function findParentType(
	nodes: TreeNodeData[],
	value: string,
	parentType: ElementNodeType | null = null,
): ElementNodeType | null | undefined {
	for (const node of nodes) {
		if (node.value === value) return parentType;
		if (node.children) {
			const result = findParentType(
				node.children,
				value,
				(node.nodeProps as ElementNodeProps).type,
			);
			if (result !== undefined) return result;
		}
	}
	return undefined;
}

function canBeChildOf(
	child: ElementNodeType,
	parent: ElementNodeType,
): boolean {
	switch (child) {
		case "folder":
		case "reading":
			return parent === "folder";
		case "extract":
			return (
				parent === "folder" ||
				parent === "reading" ||
				parent === "extract"
			);
		case "card":
			return (
				parent === "folder" ||
				parent === "reading" ||
				parent === "extract"
			);
	}
}

export interface DropPayload {
	draggedNode: string;
	targetNode: string;
	position: string;
}

export function isDropAllowed(
	data: TreeNodeData[],
	{ draggedNode, targetNode, position }: DropPayload,
): boolean {
	const draggedType = findNodeType(data, draggedNode);
	const targetType = findNodeType(data, targetNode);
	if (!draggedType || !targetType) return false;

	if (position === "inside") {
		return canBeChildOf(draggedType, targetType);
	}

	// "before" or "after" — dragged becomes sibling of target
	const parentType = findParentType(data, targetNode);
	if (parentType === undefined) return false;
	if (parentType === null) {
		// root level: only folders allowed
		return draggedType === "folder";
	}
	return canBeChildOf(draggedType, parentType);
}

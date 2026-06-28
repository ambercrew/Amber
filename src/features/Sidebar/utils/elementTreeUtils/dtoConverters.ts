import { TreeNodeData } from "@mantine/core";
import { NodeDto } from "../../../../api/elements/dto/nodeDto";
import { ElementNodeType } from "../../../../types/elements/elementNodeType";
import { ElementNodeProps } from "./elementNodeProps";

function nodeToTreeNode(node: NodeDto, type: ElementNodeType): TreeNodeData {
	const children = [
		...node.children.folders.map(f => nodeToTreeNode(f, "folder")),
		...node.children.readings.map(r => nodeToTreeNode(r, "reading")),
		...node.children.extracts.map(e => nodeToTreeNode(e, "extract")),
		...node.children.cards.map(c => nodeToTreeNode(c, "card")),
	];
	children.sort((a, b) => {
		return (a.nodeProps as ElementNodeProps).position.localeCompare(
			(b.nodeProps as ElementNodeProps).position,
		);
	});
	return {
		label: node.meta.name,
		value: node.meta.id,
		nodeProps: {
			type,
			childrenCount: children.length,
			position: node.meta.position,
		} satisfies ElementNodeProps,
		children,
	};
}

export function dtosToTreeData(folders: NodeDto[]): TreeNodeData[] {
	return folders.map(f => nodeToTreeNode(f, "folder"));
}

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

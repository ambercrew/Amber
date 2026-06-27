import { defaultTreeNodeFilter, TreeNodeData } from "@mantine/core";
import CardNodeDto from "../../../api/elements/dto/cardNodeDto";
import ExtractNodeDto from "../../../api/elements/dto/extractNodeDto";
import FolderNodeDto from "../../../api/elements/dto/folderNodeDto";
import ReadingNodeDto from "../../../api/elements/dto/readingNodeDto";
import { ElementNodeType } from "../../../types/elements/elementNodeType";

export interface ElementNodeProps {
	type: ElementNodeType;
	childrenCount: number;
}

function cardToTreeNode(card: CardNodeDto): TreeNodeData {
	return {
		label: card.name,
		value: card.id,
		nodeProps: {
			type: "card",
			childrenCount: 0,
		} satisfies ElementNodeProps,
	};
}

function extractToTreeNode(extract: ExtractNodeDto): TreeNodeData {
	const children = [
		...extract.extracts.map(extractToTreeNode),
		...extract.cards.map(cardToTreeNode),
	];
	return {
		label: extract.name,
		value: extract.id,
		nodeProps: {
			type: "extract",
			childrenCount: children.length,
		} satisfies ElementNodeProps,
		children,
	};
}

function readingToTreeNode(reading: ReadingNodeDto): TreeNodeData {
	const children = [
		...reading.extracts.map(extractToTreeNode),
		...reading.cards.map(cardToTreeNode),
	];
	return {
		label: reading.name,
		value: reading.id,
		nodeProps: {
			type: "reading",
			childrenCount: children.length,
		} satisfies ElementNodeProps,
		children,
	};
}

export function folderToTreeNode(folder: FolderNodeDto): TreeNodeData {
	const children = [
		...folder.folders.map(folderToTreeNode),
		...folder.readings.map(readingToTreeNode),
		...folder.extracts.map(extractToTreeNode),
		...folder.cards.map(cardToTreeNode),
	];
	return {
		label: folder.name,
		value: folder.id,
		nodeProps: {
			type: "folder",
			childrenCount: children.length,
		} satisfies ElementNodeProps,
		children,
	};
}

export function dtosToTreeData(folders: FolderNodeDto[]): TreeNodeData[] {
	return folders.map(folderToTreeNode);
}

export function getMatchingAncestors(
	nodes: TreeNodeData[],
	query: string,
): string[] {
	const result: string[] = [];
	for (const node of nodes) {
		const childMatches = node.children
			? getMatchingAncestors(node.children, query)
			: [];
		if (defaultTreeNodeFilter(query, node) || childMatches.length > 0) {
			result.push(node.value, ...childMatches);
		}
	}
	return result;
}

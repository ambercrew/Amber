import { TreeNodeData } from "@mantine/core";
import CardNodeDto from "../../../api/elements/dto/cardNodeDto";
import ExtractNodeDto from "../../../api/elements/dto/extractNodeDto";
import FolderNodeDto from "../../../api/elements/dto/folderNodeDto";
import ReadingNodeDto from "../../../api/elements/dto/readingNodeDto";

// TODO: move
export type ElementNodeType = "folder" | "reading" | "extract" | "card";

export interface ElementNodeProps {
	type: ElementNodeType;
}

function cardToTreeNode(card: CardNodeDto): TreeNodeData {
	return {
		label: card.name,
		value: card.id,
		nodeProps: { type: "card" } satisfies ElementNodeProps,
	};
}

function extractToTreeNode(extract: ExtractNodeDto): TreeNodeData {
	return {
		label: extract.name,
		value: extract.id,
		nodeProps: { type: "extract" } satisfies ElementNodeProps,
		children: [
			...extract.extracts.map(extractToTreeNode),
			...extract.cards.map(cardToTreeNode),
		],
	};
}

function readingToTreeNode(reading: ReadingNodeDto): TreeNodeData {
	return {
		label: reading.name,
		value: reading.id,
		nodeProps: { type: "reading" } satisfies ElementNodeProps,
		children: [
			...reading.extracts.map(extractToTreeNode),
			...reading.cards.map(cardToTreeNode),
		],
	};
}

export function folderToTreeNode(folder: FolderNodeDto): TreeNodeData {
	return {
		label: folder.name,
		value: folder.id,
		nodeProps: { type: "folder" } satisfies ElementNodeProps,
		children: [
			...folder.folders.map(folderToTreeNode),
			...folder.readings.map(readingToTreeNode),
			...folder.extracts.map(extractToTreeNode),
			...folder.cards.map(cardToTreeNode),
		],
	};
}

export function dtosToTreeData(folders: FolderNodeDto[]): TreeNodeData[] {
	return folders.map(folderToTreeNode);
}

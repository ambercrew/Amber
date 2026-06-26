import {
	defaultTreeNodeFilter,
	Group,
	Highlight,
	RenderTreeNodePayload,
	Stack,
	TextInput,
	Tree,
	TreeNodeData,
	useTree,
} from "@mantine/core";
import {
	Article,
	Cards,
	Folder,
	FolderOpen,
	Quotes,
	MagnifyingGlass,
} from "@phosphor-icons/react";
import { useState } from "react";
import FolderNodeDto from "../../../api/elements/dto/folderNodeDto";
import {
	dtosToTreeData,
	ElementNodeProps,
	ElementNodeType,
} from "./elementTreeUtils";

interface ElementNodeIconProps {
	type: ElementNodeType;
	expanded: boolean;
}

interface ElementTreeProps {
	tree: FolderNodeDto[];
}

function getMatchingAncestors(nodes: TreeNodeData[], query: string): string[] {
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

function ElementTree({ tree }: ElementTreeProps) {
	const [search, setSearch] = useState("");
	const data = dtosToTreeData(tree);
	const treeController = useTree();

	function handleSearchChange(value: string) {
		setSearch(value);
		if (value.trim()) {
			treeController.expandAllNodes();
			// collapse branches with no matches
			const matching = new Set(getMatchingAncestors(data, value));
			treeController.setExpandedState(
				Object.fromEntries([...matching].map(v => [v, true])),
			);
		} else {
			treeController.collapseAllNodes();
		}
	}

	function renderNode({
		node,
		expanded,
		elementProps,
	}: RenderTreeNodePayload) {
		const { type } = node.nodeProps as ElementNodeProps;
		const label = typeof node.label === "string" ? node.label : node.value;
		return (
			<Group gap={6} {...elementProps}>
				<ElementNodeIcon type={type} expanded={expanded} />
				<Highlight highlight={search} style={{ userSelect: "none" }}>
					{label}
				</Highlight>
			</Group>
		);
	}

	return (
		<Stack gap="xs">
			<TextInput
				placeholder="Search..."
				leftSection={<MagnifyingGlass size={16} />}
				value={search}
				onChange={e => handleSearchChange(e.currentTarget.value)}
			/>
			<Tree
				data={data}
				tree={treeController}
				renderNode={renderNode}
				withLines
			/>
		</Stack>
	);
}

// TODO: try to collect all front-end things in one place for different element types
function ElementNodeIcon({ type, expanded }: ElementNodeIconProps) {
	const size = 20;

	switch (type) {
		case "folder":
			return expanded ? (
				<FolderOpen size={size} />
			) : (
				<Folder size={size} />
			);
		case "reading":
			return <Article size={size} />;
		case "extract":
			return <Quotes size={size} />;
		case "card":
			return <Cards size={size} />;
	}
}

export default ElementTree;

import {
	getTreeExpandedState,
	Group,
	Highlight,
	RenderTreeNodePayload,
	Stack,
	TextInput,
	Tree,
	useTree,
} from "@mantine/core";
import {
	ArticleIcon,
	CardsIcon,
	CaretDownIcon,
	CaretRightIcon,
	FolderIcon,
	FolderOpenIcon,
	QuotesIcon,
	MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";
import FolderNodeDto from "../../../api/elements/dto/folderNodeDto";
import {
	dtosToTreeData,
	ElementNodeProps,
	getMatchingAncestors,
} from "../utils/elementTreeUtils";
import { ElementNodeType } from "../../../types/elements/elementNodeType";

interface ElementTreeProps {
	tree: FolderNodeDto[];
}

function ElementTree({ tree }: ElementTreeProps) {
	const [search, setSearch] = useState("");
	const expandedStateBeforeSearch = useRef<Record<string, boolean> | null>(
		null,
	);
	const data = dtosToTreeData(tree);
	const treeController = useTree();

	function handleSearchChange(value: string) {
		setSearch(value);
		if (value.trim()) {
			treeController.setExpandedState(
				getTreeExpandedState(data, getMatchingAncestors(data, value)),
			);
		} else {
			treeController.setExpandedState(
				expandedStateBeforeSearch.current ?? {},
			);
		}
	}

	function renderNode({
		node,
		expanded,
		elementProps,
	}: RenderTreeNodePayload) {
		const { type } = node.nodeProps as ElementNodeProps;
		const label = typeof node.label === "string" ? node.label : node.value;
		const hasChildren = node.children && node.children.length > 0;

		return (
			<Group gap={6} {...elementProps}>
				{hasChildren ? (
					expanded ? (
						<CaretDownIcon size={12} />
					) : (
						<CaretRightIcon size={12} />
					)
				) : (
					<div style={{ width: 12 }} />
				)}
				<ElementNodeIcon type={type} expanded={expanded} />
				<Highlight
					highlight={search}
					flex={1}
					truncate="end"
					title={label}>
					{label}
				</Highlight>
			</Group>
		);
	}

	return (
		<Stack gap="xs">
			<TextInput
				placeholder="Search..."
				leftSection={<MagnifyingGlassIcon size={16} />}
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

interface ElementNodeIconProps {
	type: ElementNodeType;
	expanded: boolean;
}

// TODO: try to collect all front-end things in one place for different element types
function ElementNodeIcon({ type, expanded }: ElementNodeIconProps) {
	const size = 20;

	switch (type) {
		case "folder":
			return expanded ? (
				<FolderOpenIcon size={size} />
			) : (
				<FolderIcon size={size} />
			);
		case "reading":
			return <ArticleIcon size={size} />;
		case "extract":
			return <QuotesIcon size={size} />;
		case "card":
			return <CardsIcon size={size} />;
	}
}

export default ElementTree;
